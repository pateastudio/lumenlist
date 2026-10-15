import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { asUser, makeUser, owner, reset } from "./helpers"

let alice: string, bob: string, carol: string, family: string, code: string

beforeAll(async () => {
  await reset()
  alice = await makeUser("alice"); bob = await makeUser("bob"); carol = await makeUser("carol")
  family = (await asUser(alice, (c) => c.query("select create_family('Fam') as id"))).rows[0].id
  code = (await owner.query("select invite_code from families where id = $1", [family])).rows[0].invite_code
})
afterAll(async () => { await reset(); await owner.end() })

const one = (userId: string | null, sql: string, params: unknown[]) =>
  asUser(userId, async (c) => (await c.query(sql, params)).rows[0])

describe("create_family", () => {
  it("makes the caller the owner", async () => {
    expect((await owner.query("select role from family_members where family_id = $1 and user_id = $2", [family, alice])).rows[0].role).toBe("owner")
  })
  it("refuses with no user", async () => {
    await expect(one(null, "select create_family('X')", [])).rejects.toThrow(/Unauthorized/)
  })
})

describe("create_invite and accept_invite", () => {
  it("a non-member can't invite", async () => {
    await expect(one(bob, "select create_invite($1, 'x@test.invalid')", [family])).rejects.toThrow(/Forbidden/)
  })
  it("a member invites; a re-invite replaces the old token", async () => {
    const t1 = (await one(alice, "select create_invite($1, 'Bob@Test.invalid') as t", [family])).t
    const t2 = (await one(alice, "select create_invite($1, 'bob@test.invalid') as t", [family])).t
    expect(t2).not.toBe(t1)
    expect((await owner.query("select count(*) from family_invites where family_id = $1", [family])).rows[0].count).toBe("1")
    expect((await one(bob, "select accept_invite($1) as f", [t1])).f).toBeNull()
    expect((await one(bob, "select accept_invite($1) as f", [t2])).f).toBe(family)
    expect((await one(bob, "select accept_invite($1) as f", [t2])).f).toBeNull() // used
  })
  it("refuses an expired token", async () => {
    const t = (await one(alice, "select create_invite($1, 'c@test.invalid') as t", [family])).t
    await owner.query("update family_invites set expires_at = now() - interval '1 minute' where token = $1", [t])
    expect((await one(carol, "select accept_invite($1) as f", [t])).f).toBeNull()
  })
  it("needs a user", async () => {
    await expect(one(null, "select accept_invite('x')", [])).rejects.toThrow(/Unauthorized/)
  })
})

describe("join_family", () => {
  it("joins by code, case-insensitively, and is idempotent", async () => {
    expect((await one(carol, "select join_family($1) as f", [` ${code.toUpperCase()} `])).f).toBe(family)
    expect((await one(carol, "select join_family($1) as f", [code])).f).toBe(family)
    expect((await owner.query("select count(*) from family_members where family_id = $1 and user_id = $2", [family, carol])).rows[0].count).toBe("1")
  })
  it("returns null for an unknown code", async () => {
    expect((await one(carol, "select join_family('nope') as f", [])).f).toBeNull()
  })
})

describe("previews", () => {
  it("work with no user and return names only", async () => {
    const t = (await one(alice, "select create_invite($1, 'd@test.invalid') as t", [family])).t
    const inv = await one(null, "select * from invite_preview($1)", [t])
    expect(Object.keys(inv).sort()).toEqual(["family_id", "family_name", "inviter_name"])
    expect(inv.family_name).toBe("Fam")
    expect(inv.inviter_name).toBe("alice")
    const join = await one(null, "select * from join_preview($1)", [code])
    expect(Object.keys(join).sort()).toEqual(["family_id", "family_name"])
  })
  it("still show the inviter's name to someone who shares no family with them (#160)", async () => {
    const stranger = await makeUser("stranger")
    const t = (await one(alice, "select create_invite($1, 's@test.invalid') as t", [family])).t
    expect((await one(stranger, "select count(*)::int as n from profiles where id = $1", [alice])).n).toBe(0)
    expect((await one(stranger, "select * from invite_preview($1)", [t])).inviter_name).toBe("alice")
    expect((await one(null, "select * from invite_preview($1)", [t])).inviter_name).toBe("alice")
  })
})
