import type pg from "pg"
import { APP_TABLES, type Snapshot } from "./load"

// Every check that must pass before users get back in. Returns the problems; empty means pass.
export async function verifySnapshot(owner: pg.ClientBase, app: pg.Pool, s: Snapshot): Promise<string[]> {
  const problems: string[] = []
  const count = async (sql: string) => Number((await owner.query(sql)).rows[0].n)

  const expected: Record<string, number> = { '"user"': s.users.length, account: s.accounts.length }
  for (const t of APP_TABLES) expected[t] = s.app[t].length
  for (const [t, n] of Object.entries(expected)) {
    const got = await count(`select count(*) as n from ${t}`)
    if (got !== n) problems.push(`${t}: ${got} rows, expected ${n}`)
  }

  const noCred = await count(`select count(*) as n from "user" u where (select count(*) from account a where a.user_id = u.id and a.provider_id = 'credential' and a.password ~ '^\\$2[aby]\\$') <> 1`)
  if (noCred) problems.push(`${noCred} users without exactly one bcrypt credential`)
  const noUser = await count(`select count(*) as n from profiles p where not exists (select 1 from "user" u where u.id = p.id)`)
  if (noUser) problems.push(`${noUser} profiles without a user`)

  // As app_user, the way withUser() asks: count rows matching sql for userId.
  const seen = async (userId: string, sql: string, param: string) => {
    const c = await app.connect()
    try {
      await c.query("begin")
      await c.query("select set_config('app.user_id', $1, true)", [userId])
      const n = Number((await c.query(sql, [param])).rows[0].n)
      await c.query("commit")
      return n
    } finally { c.release() }
  }

  // Every user can read their own profile.
  for (const { id } of s.users) {
    if ((await seen(id, "select count(*) as n from profiles where id = $1", id)) !== 1) problems.push(`user ${id} can't read their own profile`)
  }

  // Surprise preservation on the real data.
  const claims = (await owner.query(`select gc.gift_id, gc.claimed_by, g.owner_id from gift_claims gc join gifts g on g.id = gc.gift_id`)).rows
  const claimSql = "select count(*) as n from gift_claims where gift_id = $1"
  for (const { gift_id, claimed_by, owner_id } of claims) {
    if ((await seen(owner_id, claimSql, gift_id)) !== 0) problems.push(`owner ${owner_id} sees the claim on gift ${gift_id}`)
    if ((await seen(claimed_by, claimSql, gift_id)) !== 1) problems.push(`claimer ${claimed_by} can't see their claim on gift ${gift_id}`)
  }
  return problems
}
