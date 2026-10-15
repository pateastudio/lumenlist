import { sql, type SQL } from "drizzle-orm";
import ceilingConfig from "../../../drizzle/ceiling.json";
import journal from "../../../drizzle/meta/_journal.json";
import { schemaState, type CeilingConfig, type Journal, type SchemaState } from "./plan";

// Any Drizzle database (node-postgres here): only execute() is used.
type Db = { execute: (query: SQL) => Promise<unknown> };

// node-postgres returns { rows }; accept a bare array too so a driver change cannot silently break this.
function rowsOf(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result;
  return (result as { rows?: Record<string, unknown>[] }).rows ?? [];
}

/**
 * Compares what the database has applied with what this build expects. The journal and the
 * ceiling are bundled into the build, so "expected" is fixed at the commit that was built.
 */
export async function getSchemaStatus(db: Db): Promise<SchemaState> {
  const table = rowsOf(await db.execute(sql`select to_regclass('drizzle.__drizzle_migrations')::text as t`))[0]?.t;
  let lastApplied: number | null = null;
  if (table) {
    const newest = rowsOf(await db.execute(sql`select max(created_at)::text as m from drizzle.__drizzle_migrations`))[0]?.m;
    lastApplied = newest == null ? null : Number(newest);
  }
  return schemaState((journal as Journal).entries, lastApplied, (ceilingConfig as CeilingConfig).ceiling);
}
