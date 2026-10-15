import pg from "pg"

export const owner = new pg.Pool({ connectionString: process.env.TEST_OWNER_URL })
const app = new pg.Pool({ connectionString: process.env.TEST_APP_URL })
export const authService = new pg.Pool({ connectionString: process.env.TEST_AUTH_URL })

// Runs fn as app_user, the way withUser() does in the app.
export async function asUser<T>(userId: string | null, fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await app.connect()
  try {
    await c.query("begin")
    if (userId) await c.query("select set_config('app.user_id', $1, true)", [userId])
    const result = await fn(c)
    await c.query("commit")
    return result
  } catch (e) {
    await c.query("rollback")
    throw e
  } finally {
    c.release()
  }
}

export async function makeUser(name: string): Promise<string> {
  const email = `${name}-${crypto.randomUUID()}@test.invalid`
  const { rows } = await owner.query(`insert into "user" (name, email, email_verified) values ($1, $2, true) returning id`, [name, email])
  await owner.query(`insert into profiles (id, email, name) values ($1, $2, $3)`, [rows[0].id, email, name])
  return rows[0].id
}

export async function reset() {
  await owner.query(`truncate gift_claims, gifts, family_invites, family_members, families, profiles, "user" cascade`)
}
