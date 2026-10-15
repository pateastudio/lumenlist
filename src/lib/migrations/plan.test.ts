import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  appliedIndex,
  checkMigrations,
  findDestructive,
  hasContractMarker,
  indexOfMigration,
  schemaState,
  selectUpTo,
  splitPending,
  truncateJournal,
  type JournalEntry,
} from "./plan";

const entry = (idx: number, tag: string, when: number): JournalEntry => ({
  idx,
  version: "7",
  when,
  tag,
  breakpoints: true,
});

const entries = [
  entry(0, "0000_first", 100),
  entry(1, "0001_second", 200),
  entry(2, "0002_third", 300),
  entry(3, "0003_fourth", 400),
];

describe("selecting by ceiling", () => {
  it("finds a migration by number prefix or full tag", () => {
    expect(indexOfMigration(entries, "0002")).toBe(2);
    expect(indexOfMigration(entries, "0002_third")).toBe(2);
  });

  it("does not match a prefix of a longer number", () => {
    expect(() => indexOfMigration(entries, "000")).toThrow(/No migration matches/);
  });

  it("includes the ceiling itself and nothing after it", () => {
    expect(selectUpTo(entries, "0001").map((e) => e.tag)).toEqual(["0000_first", "0001_second"]);
  });

  it("truncates the journal but keeps its other fields", () => {
    const journal = { version: "7", dialect: "postgresql", entries };
    const cut = truncateJournal(journal, "0002");
    expect(cut.entries).toHaveLength(3);
    expect(cut.dialect).toBe("postgresql");
  });
});

describe("splitting pending migrations at the ceiling", () => {
  it("applies pending migrations up to the ceiling and holds the rest", () => {
    const { apply, hold } = splitPending(entries, 200, "0002");
    expect(apply.map((e) => e.tag)).toEqual(["0002_third"]);
    expect(hold.map((e) => e.tag)).toEqual(["0003_fourth"]);
  });

  it("treats everything as pending when nothing was applied", () => {
    const { apply, hold } = splitPending(entries, null, "0001");
    expect(apply.map((e) => e.tag)).toEqual(["0000_first", "0001_second"]);
    expect(hold.map((e) => e.tag)).toEqual(["0002_third", "0003_fourth"]);
  });

  it("applies nothing when the database is already at the ceiling", () => {
    const { apply, hold } = splitPending(entries, 300, "0002");
    expect(apply).toEqual([]);
    expect(hold.map((e) => e.tag)).toEqual(["0003_fourth"]);
  });
});

describe("finding destructive statements", () => {
  it.each([
    ["DROP TABLE", 'DROP TABLE "parties";', "drops something"],
    ["DROP COLUMN", 'ALTER TABLE "parties" DROP COLUMN "search_tokens";', "drops something"],
    ["DROP INDEX", 'DROP INDEX IF EXISTS "parties_search_tokens_idx";', "drops something"],
    ["DROP CONSTRAINT", 'ALTER TABLE "a" DROP CONSTRAINT "a_fk";', "drops something"],
    ["RENAME COLUMN", 'ALTER TABLE "a" RENAME COLUMN "x" TO "y";', "renames something"],
    ["RENAME TABLE", 'ALTER TABLE "a" RENAME TO "b";', "renames something"],
    ["column type", 'ALTER TABLE "a" ALTER COLUMN "x" SET DATA TYPE integer;', "changes a column's type"],
    ["column type (short)", 'ALTER TABLE "a" ALTER COLUMN "x" TYPE integer;', "changes a column's type"],
    ["SET NOT NULL", 'ALTER TABLE "a" ALTER COLUMN "x" SET NOT NULL;', "adds NOT NULL to an existing column"],
    ["NOT NULL column, no default", 'ALTER TABLE "a" ADD COLUMN "x" text NOT NULL;', "adds a NOT NULL column with no default"],
    ["TRUNCATE", 'TRUNCATE TABLE "a";', "deletes rows"],
    ["DELETE", 'DELETE FROM "a" WHERE x = 1;', "deletes rows"],
  ])("flags %s", (_name, sql, rule) => {
    const found = findDestructive(sql);
    expect(found).toHaveLength(1);
    expect(found[0].rule).toContain(rule);
  });

  it.each([
    ["CREATE TABLE", 'CREATE TABLE "a" ("id" uuid PRIMARY KEY NOT NULL);'],
    ["nullable column", 'ALTER TABLE "a" ADD COLUMN "x" text;'],
    ["NOT NULL column with a default", 'ALTER TABLE "a" ADD COLUMN "x" text DEFAULT \'\' NOT NULL;'],
    ["DROP NOT NULL (relaxes)", 'ALTER TABLE "a" ALTER COLUMN "x" DROP NOT NULL;'],
    ["DROP DEFAULT (relaxes)", 'ALTER TABLE "a" ALTER COLUMN "x" DROP DEFAULT;'],
    ["CREATE INDEX", 'CREATE UNIQUE INDEX IF NOT EXISTS "i" ON "a" USING btree ("x");'],
    ["backfill UPDATE", 'UPDATE "a" SET "y" = lower("x") WHERE "y" IS NULL;'],
  ])("allows %s", (_name, sql) => {
    expect(findDestructive(sql)).toEqual([]);
  });

  it("ignores words inside comments", () => {
    const sql = '-- Later we will DROP the column and RENAME it.\nALTER TABLE "a" ADD COLUMN "x" text;';
    expect(findDestructive(sql)).toEqual([]);
  });

  it("looks at every statement in a migration", () => {
    const sql = 'ALTER TABLE "a" ADD COLUMN "x" text;--> statement-breakpoint\nDROP TABLE "b";';
    expect(findDestructive(sql).map((f) => f.rule)).toEqual(["drops something"]);
  });

  it("recognises the contract marker, and only with a reason", () => {
    expect(hasContractMarker("-- contract: the old lookup is gone in 0.9\nDROP TABLE a;")).toBe(true);
    expect(hasContractMarker("-- contract:\nDROP TABLE a;")).toBe(false);
    expect(hasContractMarker("-- contract is a nice word\nDROP TABLE a;")).toBe(false);
  });
});

describe("checking a set of migrations against the ceiling", () => {
  const sql: Record<string, string> = {
    "0000_first": 'DROP TABLE "legacy";', // history, before enforceFrom
    "0001_second": 'ALTER TABLE "a" ADD COLUMN "x" text;',
    "0002_third": 'ALTER TABLE "a" DROP COLUMN "y";',
    "0003_fourth": 'DROP TABLE "b";',
  };
  const readSql = (tag: string) => sql[tag];

  it("flags a destructive migration at or below the ceiling", () => {
    const { violations } = checkMigrations({ entries, readSql, ceiling: "0002", enforceFrom: "0001" });
    expect(violations.map((v) => v.tag)).toEqual(["0002_third"]);
  });

  it("ignores history before enforceFrom", () => {
    const { violations } = checkMigrations({ entries, readSql, ceiling: "0001", enforceFrom: "0001" });
    expect(violations).toEqual([]);
  });

  it("holds back a destructive migration above the ceiling instead of flagging it", () => {
    const { violations, held } = checkMigrations({ entries, readSql, ceiling: "0001", enforceFrom: "0001" });
    expect(violations).toEqual([]);
    expect(held).toEqual(["0002_third", "0003_fourth"]);
  });

  it("accepts a destructive migration that carries the contract marker", () => {
    const marked: Record<string, string> = { ...sql, "0002_third": `-- contract: 0.9 no longer reads y\n${sql["0002_third"]}` };
    const { violations } = checkMigrations({
      entries,
      readSql: (t) => marked[t],
      ceiling: "0002",
      enforceFrom: "0001",
    });
    expect(violations).toEqual([]);
  });

  it("reports an accepted migration separately instead of failing", () => {
    const { violations, accepted } = checkMigrations({
      entries,
      readSql,
      ceiling: "0002",
      enforceFrom: "0001",
      accepted: { "0002_third": "old code is gone in every environment" },
    });
    expect(violations).toEqual([]);
    expect(accepted.map((a) => a.tag)).toEqual(["0002_third"]);
  });

  it("refuses an acceptance with no reason", () => {
    expect(() =>
      checkMigrations({ entries, readSql, ceiling: "0002", enforceFrom: "0001", accepted: { "0002_third": "  " } }),
    ).toThrow(/needs a reason/);
  });

  it("refuses an enforceFrom above the ceiling", () => {
    expect(() => checkMigrations({ entries, readSql, ceiling: "0001", enforceFrom: "0003" })).toThrow(
      /above the ceiling/,
    );
  });
});

describe("does the database have the schema this build expects", () => {
  it("is current when the newest applied migration is the ceiling", () => {
    expect(schemaState(entries, 300, "0002")).toEqual({ applied: 2, expected: 2, state: "current" });
  });

  it("is behind when the database lacks a migration the build needs", () => {
    expect(schemaState(entries, 200, "0002")).toEqual({ applied: 1, expected: 2, state: "behind" });
  });

  it("is behind when nothing has been applied", () => {
    expect(schemaState(entries, null, "0000")).toEqual({ applied: null, expected: 0, state: "behind" });
  });

  it("is ahead, and fine, when the database has more than this build needs", () => {
    expect(schemaState(entries, 400, "0001")).toEqual({ applied: 3, expected: 1, state: "ahead" });
  });

  it("finds the newest applied migration between two journal timestamps", () => {
    expect(appliedIndex(entries, 250)).toBe(1);
    expect(appliedIndex(entries, 50)).toBeNull();
  });
});

describe("this repo's migrations", () => {
  it("pass the destructive-statement check at the current ceiling", () => {
    const journalFile = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8"));
    const config = JSON.parse(readFileSync("drizzle/ceiling.json", "utf8"));
    const result = checkMigrations({
      entries: journalFile.entries,
      readSql: (tag: string) => readFileSync(`drizzle/${tag}.sql`, "utf8"),
      ceiling: config.ceiling,
      enforceFrom: config.enforceFrom,
      accepted: config.accepted,
    });
    expect(result.violations).toEqual([]);
  });
});
