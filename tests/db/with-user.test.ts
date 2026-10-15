import { sql } from "drizzle-orm"
import { afterAll, describe, expect, it } from "vitest"
import { appDb } from "@/lib/db"
import { withAnonymous, withUser } from "@/lib/db/with-user"
import { makeUser, owner, reset } from "./helpers"

afterAll(async () => { await reset(); await owner.end() })

describe("withUser", () => {
  it("sets app.user_id inside the transaction and not after it", async () => {
    const id = await makeUser("w")
    const inside = await withUser(id, async (tx) => (await tx.execute(sql`select auth.uid() as u`)).rows[0].u)
    expect(inside).toBe(id)
    const after = (await appDb.execute(sql`select auth.uid() as u`)).rows[0].u
    expect(after).toBeNull()
  })
  it("withAnonymous sees no profiles", async () => {
    await makeUser("x")
    const n = await withAnonymous(async (tx) => (await tx.execute(sql`select count(*)::int as n from profiles`)).rows[0].n)
    expect(n).toBe(0)
  })
})
