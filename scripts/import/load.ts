import type pg from "pg"
import type { BetterAuthAccount, BetterAuthUser } from "./map"

export type Row = Record<string, string | null>
export const APP_TABLES = ["profiles", "families", "family_members", "family_invites", "gifts", "gift_claims"] as const
export type AppTable = (typeof APP_TABLES)[number]
export type Snapshot = { users: BetterAuthUser[]; accounts: BetterAuthAccount[]; app: Record<AppTable, Row[]> }

async function insertAll(c: pg.ClientBase, table: string, rows: Record<string, unknown>[]) {
  for (const r of rows) {
    const cols = Object.keys(r)
    await c.query(
      `insert into ${table} (${cols.map((k) => `"${k}"`).join(", ")}) values (${cols.map((_, i) => `$${i + 1}`).join(", ")})`,
      cols.map((k) => r[k]),
    )
  }
}

// One transaction, as the branch owner (RLS doesn't apply to the owner). Refuses a target with
// any users or families. The family trigger is off so copied owner memberships aren't duplicated.
export async function loadSnapshot(c: pg.ClientBase, s: Snapshot): Promise<void> {
  await c.query("begin")
  try {
    const { rows } = await c.query(`select (select count(*) from "user") + (select count(*) from families) as n`)
    if (Number(rows[0].n) > 0) throw new Error("target is not empty; refusing to import")
    await c.query("alter table families disable trigger on_family_created")
    await insertAll(c, `"user"`, s.users)
    await insertAll(c, "account", s.accounts)
    for (const t of APP_TABLES) await insertAll(c, t, s.app[t])
    await c.query("alter table families enable trigger on_family_created")
    await c.query("commit")
  } catch (e) {
    await c.query("rollback")
    throw e
  }
}
