// From the Phase 2 review: policies nothing used that would have let app code past the invite
// flow or move a claim. Membership and invite acceptance go only through definer functions.
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { asUser, makeUser, owner, reset } from "./helpers"

let alice: string, bob: string, carol: string, family: string, mug: string, book: string, token: string

beforeAll(async () => {
  await reset()
  alice = await makeUser("alice"); bob = await makeUser("bob"); carol = await makeUser("carol")
  family = (await asUser(alice, (c) => c.query("select create_family('Fam') as id"))).rows[0].id
  await owner.query("insert into family_members (family_id, user_id) values ($1, $2)", [family, bob])
  mug = (await asUser(alice, (c) => c.query("insert into gifts (owner_id, title) values ($1, 'Mug') returning id", [alice]))).rows[0].id
  book = (await asUser(alice, (c) => c.query("insert into gifts (owner_id, title) values ($1, 'Book') returning id", [alice]))).rows[0].id
  await asUser(bob, (c) => c.query("insert into gift_claims (gift_id, claimed_by) values ($1, $2)", [mug, bob]))
  const carolEmail = (await owner.query("select email from profiles where id = $1", [carol])).rows[0].email
  token = (await asUser(alice, (c) => c.query("select create_invite($1, $2) as t", [family, carolEmail]))).rows[0].t
})
afterAll(async () => { await reset(); await owner.end() })

describe("membership only through the definer functions", () => {
  it("a signed-in user can't add themselves to someone else's family", async () => {
    await expect(asUser(carol, (c) => c.query("insert into family_members (family_id, user_id) values ($1, $2)", [family, carol])))
      .rejects.toThrow(/row-level security|permission denied/)
  })
})

describe("invites can't be rewritten", () => {
  it("an invitee can't change their invite's family, token or expiry", async () => {
    const res = await asUser(carol, (c) => c.query("update family_invites set expires_at = now() + interval '1 year' where token = $1", [token]))
      .catch((e) => e)
    expect(res instanceof Error ? res.message : `${res.rowCount} rows`).toMatch(/row-level security|permission denied|0 rows/)
  })
})

describe("a claim can only change its status", () => {
  it("the claimer can mark it purchased", async () => {
    const r = await asUser(bob, (c) => c.query("update gift_claims set status = 'purchased', updated_at = now() where gift_id = $1", [mug]))
    expect(r.rowCount).toBe(1)
  })
  it("the claimer can't move it to another gift", async () => {
    await expect(asUser(bob, (c) => c.query("update gift_claims set gift_id = $1 where gift_id = $2", [book, mug])))
      .rejects.toThrow(/permission denied/)
  })
  it("the claimer can't hand it to someone else", async () => {
    await expect(asUser(bob, (c) => c.query("update gift_claims set claimed_by = $1 where gift_id = $2", [carol, mug])))
      .rejects.toThrow(/permission denied|row-level security/)
  })
})
