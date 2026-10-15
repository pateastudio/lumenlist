import { describe, expect, it, vi } from "vitest";
import ceilingConfig from "../../../drizzle/ceiling.json";
import journal from "../../../drizzle/meta/_journal.json";
import { indexOfMigration } from "./plan";
import { getSchemaStatus } from "./status";

// A database whose answers are scripted, in the order the code asks.
function db(...answers: unknown[]) {
  const execute = vi.fn();
  for (const a of answers) execute.mockResolvedValueOnce(a);
  return { execute } as unknown as Parameters<typeof getSchemaStatus>[0];
}

const expected = indexOfMigration(journal.entries, ceilingConfig.ceiling);
const when = (i: number) => String(journal.entries[i].when);

describe("getSchemaStatus", () => {
  it("is behind when the migrations table does not exist yet", async () => {
    const result = await getSchemaStatus(db({ rows: [{ t: null }] }));
    expect(result).toEqual({ applied: null, expected, state: "behind" });
  });

  it("is behind when the database stops short of the ceiling", async () => {
    const result = await getSchemaStatus(db({ rows: [{ t: "drizzle.__drizzle_migrations" }] }, { rows: [{ m: when(expected - 1) }] }));
    expect(result.state).toBe("behind");
    expect(result.applied).toBe(expected - 1);
  });

  it("is current at the ceiling", async () => {
    const result = await getSchemaStatus(db({ rows: [{ t: "x" }] }, { rows: [{ m: when(expected) }] }));
    expect(result).toEqual({ applied: expected, expected, state: "current" });
  });

  it("is ahead when migrations above the ceiling were applied", async () => {
    if (expected + 1 >= journal.entries.length) return; // the ceiling is the newest migration: nothing above it
    const result = await getSchemaStatus(db({ rows: [{ t: "x" }] }, { rows: [{ m: when(expected + 1) }] }));
    expect(result.state).toBe("ahead");
  });

  it("accepts a driver that returns bare rows", async () => {
    const result = await getSchemaStatus(db([{ t: "x" }], [{ m: when(expected) }]));
    expect(result.state).toBe("current");
  });

  it("is behind when the table exists but is empty", async () => {
    const result = await getSchemaStatus(db({ rows: [{ t: "x" }] }, { rows: [{ m: null }] }));
    expect(result.state).toBe("behind");
  });
});
