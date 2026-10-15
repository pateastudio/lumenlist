// Which migrations may run, and which are held back. The rule is expand then contract
// (ADR 0006): a release may add columns, tables and indexes, and must not remove or
// rename anything the previous release still reads. Removals ship in a later release.
//
// `drizzle-kit migrate` applies every pending migration in order and cannot stop part
// way, so a destructive migration that is merged but not yet safe would run with the
// rest. The ceiling in drizzle/ceiling.json is the reviewed boundary: the runner never
// applies past it, and the check below keeps a destructive migration from sitting
// underneath it unnoticed. Adapted from wedding-platform.

export type JournalEntry = {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
};

export type Journal = { version: string; dialect: string; entries: JournalEntry[] };

export type CeilingConfig = {
  /** Last migration that may be applied: a number prefix ("0010") or a full tag. */
  ceiling: string;
  /** First migration the destructive-statement check applies to. Older ones are history. */
  enforceFrom: string;
  note?: string;
  /**
   * Migrations at or below the ceiling that the check flags but a reviewer accepted on purpose,
   * each with the reason. Prefer a `-- contract:` marker in the migration itself; this is for one
   * that is already merged and cannot sensibly be edited.
   */
  accepted?: Record<string, string>;
};

export type Violation = { tag: string; rule: string; statement: string };

/** Position of a migration in the journal, by number prefix ("0010") or full tag. */
export function indexOfMigration(entries: JournalEntry[], ref: string): number {
  const i = entries.findIndex((e) => e.tag === ref || e.tag.startsWith(`${ref}_`));
  if (i === -1) throw new Error(`No migration matches "${ref}"`);
  return i;
}

/** Everything up to and including the ceiling. */
export function selectUpTo(entries: JournalEntry[], ceiling: string): JournalEntry[] {
  return entries.slice(0, indexOfMigration(entries, ceiling) + 1);
}

/** The journal with only the migrations a run may apply. Already-applied ones stay in it: drizzle skips them. */
export function truncateJournal(journal: Journal, ceiling: string): Journal {
  return { ...journal, entries: selectUpTo(journal.entries, ceiling) };
}

/**
 * Split what is pending into what the run applies and what it holds back. `lastApplied` is
 * the newest `created_at` in drizzle's migrations table, or null when nothing was applied.
 * Drizzle treats a migration as pending when its journal `when` is newer than that.
 */
export function splitPending(
  entries: JournalEntry[],
  lastApplied: number | null,
  ceiling: string,
): { apply: JournalEntry[]; hold: JournalEntry[] } {
  const limit = indexOfMigration(entries, ceiling);
  const pending = entries.filter((e) => lastApplied === null || e.when > lastApplied);
  return {
    apply: pending.filter((e) => entries.indexOf(e) <= limit),
    hold: pending.filter((e) => entries.indexOf(e) > limit),
  };
}

export type SchemaState = {
  /** Position of the newest migration the database has applied, or null if none. */
  applied: number | null;
  /** Position of the newest migration this build needs: the ceiling. */
  expected: number;
  /** behind: the build needs migrations the database lacks. ahead: the database has more than this build needs (a code rollback). */
  state: "current" | "ahead" | "behind";
};

/** Position of the newest journal entry the database has applied, given its newest `created_at`. */
export function appliedIndex(entries: JournalEntry[], lastApplied: number | null): number | null {
  if (lastApplied === null) return null;
  let found: number | null = null;
  entries.forEach((e, i) => {
    if (e.when <= lastApplied) found = i;
  });
  return found;
}

/**
 * Does the database have the schema this build expects? Used by /api/health, so a deploy that
 * went out without its migration fails a smoke test in seconds. A database that is AHEAD is fine:
 * migrations only add, so older code still works on a newer schema (that is what makes a code
 * rollback safe). BEHIND is the failure: the code needs something the database does not have.
 */
export function schemaState(entries: JournalEntry[], lastApplied: number | null, ceiling: string): SchemaState {
  const expected = indexOfMigration(entries, ceiling);
  const applied = appliedIndex(entries, lastApplied);
  const state = applied === null || applied < expected ? "behind" : applied === expected ? "current" : "ahead";
  return { applied, expected, state };
}

/** A line `-- contract: <reason>` says a reviewer has seen that this migration removes something on purpose. */
export function hasContractMarker(sql: string): boolean {
  // Spaces and tabs only: `\s` would run over the newline and accept an empty reason.
  return /^[ \t]*--[ \t]*contract:[ \t]*\S+/im.test(sql);
}

function statements(sql: string): string[] {
  return sql
    .split("--> statement-breakpoint")
    .map((chunk) => chunk.replace(/--[^\n]*/g, ""))
    .flatMap((chunk) => chunk.split(";"))
    .map((s) => s.trim().replace(/\s+/g, " "))
    .filter(Boolean);
}

const RULES: { rule: string; test: RegExp; not?: RegExp }[] = [
  // DROP NOT NULL, DROP DEFAULT and the like only relax a constraint, which old code survives.
  { rule: "drops something", test: /\bDROP\s+(?!NOT\s+NULL\b|DEFAULT\b|IDENTITY\b|EXPRESSION\b)/i },
  { rule: "renames something", test: /\bRENAME\b/i },
  { rule: "changes a column's type", test: /\bALTER\s+COLUMN\s+\S+\s+(SET\s+DATA\s+)?TYPE\b/i },
  { rule: "adds NOT NULL to an existing column", test: /\bSET\s+NOT\s+NULL\b/i },
  {
    rule: "adds a NOT NULL column with no default (old code's inserts would fail)",
    test: /\bADD\s+COLUMN\b.*\bNOT\s+NULL\b/i,
    not: /\bDEFAULT\b/i,
  },
  { rule: "deletes rows", test: /\b(TRUNCATE|DELETE\s+FROM)\b/i },
];

/** Statements in a migration that remove or change something the previous release may still use. */
export function findDestructive(sql: string): { rule: string; statement: string }[] {
  const found: { rule: string; statement: string }[] = [];
  for (const statement of statements(sql)) {
    for (const { rule, test, not } of RULES) {
      if (test.test(statement) && !(not && not.test(statement))) {
        found.push({ rule, statement: statement.length > 90 ? `${statement.slice(0, 90)}...` : statement });
      }
    }
  }
  return found;
}

/**
 * Check the migrations a release may apply (from `enforceFrom` up to the ceiling). A
 * destructive one needs an explicit `-- contract:` marker, or must sit above the
 * ceiling, where it is held back until the release that is safe for it.
 */
export function checkMigrations(opts: {
  entries: JournalEntry[];
  readSql: (tag: string) => string;
  ceiling: string;
  enforceFrom: string;
  accepted?: Record<string, string>;
}): { violations: Violation[]; accepted: Violation[]; held: string[] } {
  const { entries, readSql, ceiling, enforceFrom, accepted = {} } = opts;
  for (const [tag, reason] of Object.entries(accepted)) {
    if (!reason.trim()) throw new Error(`Accepting ${tag} needs a reason`);
  }
  const limit = indexOfMigration(entries, ceiling);
  const from = indexOfMigration(entries, enforceFrom);
  if (from > limit) throw new Error(`enforceFrom "${enforceFrom}" is above the ceiling "${ceiling}"`);

  const violations: Violation[] = [];
  const acceptedFound: Violation[] = [];
  for (const entry of entries.slice(from, limit + 1)) {
    const sql = readSql(entry.tag);
    if (hasContractMarker(sql)) continue;
    for (const f of findDestructive(sql)) {
      (entry.tag in accepted ? acceptedFound : violations).push({ tag: entry.tag, ...f });
    }
  }
  return { violations, accepted: acceptedFound, held: entries.slice(limit + 1).map((e) => e.tag) };
}
