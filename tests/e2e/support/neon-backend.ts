// The e2e suite's Neon + Better Auth backend. Writes test users straight into the dev or staging
// branch as the owner (verified, with a bcrypt password, as Better Auth would), and counts claims
// as app_user with app.user_id set, so RLS decides, as in the app.
import bcrypt from "bcryptjs"
import pg from "pg"
import type { TestBackend, TestUser } from "./backend"
import { testEmail } from "./emails"
import { testPassword } from "./passwords"

const owner = new pg.Pool({ connectionString: process.env.E2E_DATABASE_URL, max: 2 })
const app = new pg.Pool({ connectionString: process.env.E2E_APP_DATABASE_URL, max: 2 })

export const neonBackend: TestBackend = {
  async createUser(label, options) {
    const email = testEmail(label), name = `E2E ${label}`, password = testPassword()
    const { rows } = await owner.query(`insert into "user" (name, email, email_verified) values ($1, $2, true) returning id`, [name, email])
    const id = rows[0].id
    // Better Auth's credential account: account_id is the user id as text.
    await owner.query(`insert into account (account_id, provider_id, user_id, password) values ($1, 'credential', $2, $3)`, [String(id), id, await bcrypt.hash(password, 10)])
    await owner.query(`insert into profiles (id, email, name) values ($1, $2, $3)`, [id, email, name])
    if (options?.tour !== "fresh") {
      await owner.query(
        `insert into onboarding (user_id, walk_ended_at, walk_outcome, steps_ended_at, steps_outcome) values ($1, now(), 'skipped', now(), 'hidden')`,
        [id],
      )
    }
    return { id, email, password, name } satisfies TestUser
  },
  async deleteUser(user) {
    await owner.query(`delete from families where created_by = $1`, [user.id])
    await owner.query(`delete from "user" where id = $1`, [user.id])
  },
  async deleteUserByEmail(email) {
    await owner.query(`delete from families where created_by in (select id from "user" where email = $1)`, [email])
    await owner.query(`delete from "user" where email = $1`, [email])
  },
  async inviteToken(familyId, email) {
    const { rows } = await owner.query(`select token from family_invites where family_id = $1 and email = lower($2) and accepted_at is null`, [familyId, email])
    if (!rows[0]) throw new Error("no invite")
    return rows[0].token
  },
  async claimsVisibleTo(user, giftId) {
    const c = await app.connect()
    try {
      await c.query("begin")
      await c.query("select set_config('app.user_id', $1, true)", [user.id])
      const { rows } = await c.query("select count(*)::int as n from gift_claims where gift_id = $1", [giftId])
      await c.query("commit")
      return rows[0].n
    } finally { c.release() }
  },
  async tourRow(user) {
    const { rows } = await owner.query(`select walk_ended_at, walk_outcome, steps_ended_at, steps_outcome, peeked_at, secret_seen_at, hints_read from onboarding where user_id = $1`, [user.id])
    return rows[0]
  },
}
