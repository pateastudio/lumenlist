// Plans or applies database migrations, stopping at the reviewed ceiling in drizzle/ceiling.json.
//
//   pnpm db:migrate                  prints the plan and changes nothing (the default)
//   pnpm db:migrate --apply       applies what the plan says
//   pnpm db:migrate --to 0009     stops earlier than the ceiling (never later)
//
// Why not plain `drizzle-kit migrate`? It applies every pending migration, in order, with no
// way to stop part way, so a merged-but-not-yet-safe migration (a column drop whose code is
// not live everywhere) would run with the rest. Here the ceiling is the boundary, and the
// tests check that nothing destructive sits below it.
//
// Uses DATABASE_URL_UNPOOLED, like drizzle.config.ts.
import pg from "pg";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  checkMigrations,
  indexOfMigration,
  splitPending,
  truncateJournal,
  type CeilingConfig,
  type Journal,
} from "../src/lib/migrations/plan";

const root = process.cwd();
const dir = join(root, "drizzle");

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

async function lastApplied(url: string): Promise<number | null> {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    const { rows: [{ t }] } = await client.query("select to_regclass('drizzle.__drizzle_migrations')::text as t");
    if (!t) return null;
    const { rows: [{ m }] } = await client.query("select max(created_at)::text as m from drizzle.__drizzle_migrations");
    return m === null ? null : Number(m);
  } finally {
    await client.end();
  }
}

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED;
  if (!url) fail("DATABASE_URL_UNPOOLED is not set. Run it through scripts/migrate.sh <env>, which reads it from SSM.");

  const journal: Journal = JSON.parse(readFileSync(join(dir, "meta/_journal.json"), "utf8"));
  const config: CeilingConfig = JSON.parse(readFileSync(join(dir, "ceiling.json"), "utf8"));

  // --to can only be stricter than the ceiling, never looser.
  let ceiling = config.ceiling;
  const to = arg("--to");
  if (to) {
    if (indexOfMigration(journal.entries, to) > indexOfMigration(journal.entries, config.ceiling)) {
      fail(`--to ${to} is above the ceiling (${config.ceiling}). Raise the ceiling in drizzle/ceiling.json, in a reviewed PR.`);
    }
    ceiling = to;
  }
  const ceilingEntry = journal.entries[indexOfMigration(journal.entries, ceiling)];

  const applied = await lastApplied(url);
  const { apply, hold } = splitPending(journal.entries, applied, ceiling);
  const last = journal.entries.filter((e) => applied !== null && e.when <= applied).pop();

  console.log(`Target:        ${new URL(url).hostname}`);
  console.log(`Applied so far: ${last ? `through ${last.tag}` : "nothing"}`);
  console.log(`Ceiling:       ${ceilingEntry.tag}`);
  console.log(`Would apply (${apply.length}): ${apply.map((e) => e.tag).join(", ") || "nothing"}`);
  console.log(`Held back (${hold.length}):   ${hold.map((e) => e.tag).join(", ") || "nothing"}${hold.length ? "  (above the ceiling)" : ""}`);

  // Say out loud any risk a reviewer accepted for a migration this run would apply.
  const { accepted } = checkMigrations({
    entries: journal.entries,
    readSql: (tag) => readFileSync(join(dir, `${tag}.sql`), "utf8"),
    ceiling: config.ceiling,
    enforceFrom: config.enforceFrom,
    accepted: config.accepted,
  });
  const applyTags = new Set(apply.map((e) => e.tag));
  for (const tag of new Set(accepted.map((a) => a.tag))) {
    if (applyTags.has(tag)) console.log(`\nAccepted risk in ${tag}:\n  ${config.accepted?.[tag]}`);
  }

  if (!process.argv.includes("--apply")) {
    console.log("\nPlan only. Nothing was changed. Add --apply to run it.");
    return;
  }
  if (apply.length === 0) {
    console.log("\nNothing to apply.");
    return;
  }

  // drizzle-kit applies everything in the folder it is given, so give it a folder that
  // stops at the ceiling. It lives inside the repo so the config can resolve drizzle-kit.
  const tmp = mkdtempSync(join(root, ".migrate-tmp-"));
  try {
    mkdirSync(join(tmp, "meta"));
    const cut = truncateJournal(journal, ceiling);
    writeFileSync(join(tmp, "meta/_journal.json"), JSON.stringify(cut, null, 2));
    for (const e of cut.entries) copyFileSync(join(dir, `${e.tag}.sql`), join(tmp, `${e.tag}.sql`));
    writeFileSync(
      join(tmp, "drizzle.config.ts"),
      [
        'import { defineConfig } from "drizzle-kit";',
        "export default defineConfig({",
        `  out: ${JSON.stringify(tmp)},`,
        `  schema: ${JSON.stringify(resolve(root, "src/db/schema.ts"))},`,
        '  dialect: "postgresql",',
        "  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED! },",
        "});",
        "",
      ].join("\n"),
    );
    console.log("\nApplying...");
    const run = spawnSync("pnpm", ["exec", "drizzle-kit", "migrate", "--config", join(tmp, "drizzle.config.ts")], {
      stdio: "inherit",
      env: process.env,
    });
    if (run.status !== 0) fail("drizzle-kit migrate failed. Check the output above; nothing past the failing migration ran.");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }

  const after = await lastApplied(url);
  const remaining = splitPending(journal.entries, after, ceiling);
  console.log(`\nDone. Pending at or below the ceiling: ${remaining.apply.length}. Held back: ${remaining.hold.length}.`);
  if (remaining.apply.length > 0) fail("Some migrations at or below the ceiling are still pending. Investigate before deploying.");
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
