// Surprise preservation and isolation, enforced by RLS. These are the guarantees the app depends
// on; a failure here is a privacy bug, not a flaky test.
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { asUser, authService, makeUser, owner, reset } from "./helpers"

let alice: string, bob: string, carol: string, dave: string, family: string, gift: string

beforeAll(async () => {
  await reset()
  alice = await makeUser("alice") // owns the gift
  bob = await makeUser("bob")     // same family, claims it
  carol = await makeUser("carol") // same family
  dave = await makeUser("dave")   // no shared family
  family = (await asUser(alice, (c) => c.query("select create_family('Fam') as id"))).rows[0].id
  for (const u of [bob, carol]) {
    await owner.query("insert into family_members (family_id, user_id) values ($1, $2)", [family, u])
  }
  gift = (await asUser(alice, (c) => c.query("insert into gifts (owner_id, title) values ($1, 'Mug') returning id", [alice]))).rows[0].id
  await asUser(bob, (c) => c.query("insert into gift_claims (gift_id, claimed_by) values ($1, $2)", [gift, bob]))
})

afterAll(async () => {
  await reset()
  await owner.end()
  await authService.end()
})

const count = (userId: string | null, table: string, where = "true", params: unknown[] = []) =>
  asUser(userId, async (c) => Number((await c.query(`select count(*) from ${table} where ${where}`, params)).rows[0].count))

describe("surprise preservation", () => {
  it("the owner sees no claim on their own gift", async () => {
    expect(await count(alice, "gift_claims", "gift_id = $1", [gift])).toBe(0)
  })
  it("the claimer sees their claim", async () => {
    expect(await count(bob, "gift_claims", "gift_id = $1", [gift])).toBe(1)
  })
  it("another family member sees it", async () => {
    expect(await count(carol, "gift_claims", "gift_id = $1", [gift])).toBe(1)
  })
  it("an outsider sees neither the gift nor the claim", async () => {
    expect(await count(dave, "gifts", "id = $1", [gift])).toBe(0)
    expect(await count(dave, "gift_claims", "gift_id = $1", [gift])).toBe(0)
  })
  it("the owner can't claim their own gift", async () => {
    await expect(asUser(alice, (c) => c.query("insert into gift_claims (gift_id, claimed_by) values ($1, $2)", [gift, alice])))
      .rejects.toThrow(/row-level security/)
  })
  it("the owner can't reach the claim by joining from gifts either", async () => {
    const rows = await asUser(alice, async (c) =>
      (await c.query("select gc.id from gifts g left join gift_claims gc on gc.gift_id = g.id where g.id = $1", [gift])).rows)
    expect(rows).toEqual([{ id: null }])
  })
})

describe("with no user set", () => {
  it.each(["profiles", "families", "family_members", "family_invites", "gifts", "gift_claims"])(
    "%s returns zero rows", async (table) => {
      expect(await count(null, table)).toBe(0)
    })
})

describe("role boundaries", () => {
  it.each(["\"user\"", "session", "account", "verification", "rate_limit"])(
    "app_user can't read %s", async (table) => {
      await expect(asUser(alice, (c) => c.query(`select 1 from ${table} limit 1`))).rejects.toThrow(/permission denied/)
    })
  it("auth_service can't read gifts or claims", async () => {
    await expect(authService.query("select 1 from gifts limit 1")).rejects.toThrow(/permission denied/)
    await expect(authService.query("select 1 from gift_claims limit 1")).rejects.toThrow(/permission denied/)
  })
})

// profiles_select (drizzle/0007, #160): your own profile and those of people who share at least
// one family with you. Nobody else's, and nothing with no user set.
describe("profile visibility", () => {
  it("everyone reads their own profile, even with no family", async () => {
    expect(await count(dave, "profiles", "id = $1", [dave])).toBe(1)
    expect(await count(alice, "profiles", "id = $1", [alice])).toBe(1)
  })
  it("a family member reads the others' profiles", async () => {
    expect(await count(alice, "profiles", "id = any($1)", [[bob, carol]])).toBe(2)
    expect(await count(bob, "profiles", "id = $1", [alice])).toBe(1)
  })
  it("a stranger's profile is not readable, either way", async () => {
    expect(await count(dave, "profiles", "id = $1", [alice])).toBe(0)
    expect(await count(alice, "profiles", "id = $1", [dave])).toBe(0)
    expect(await count(dave, "profiles")).toBe(1)
    expect(await count(alice, "profiles")).toBe(3)
  })
  it("sharing any one family is enough", async () => {
    const erin = await makeUser("erin")
    const other = (await asUser(erin, (c) => c.query("select create_family('Other') as id"))).rows[0].id
    await owner.query("insert into family_members (family_id, user_id) values ($1, $2)", [other, dave])
    expect(await count(erin, "profiles", "id = $1", [dave])).toBe(1)
    expect(await count(erin, "profiles", "id = $1", [alice])).toBe(0)
    await owner.query("delete from family_members where user_id = $1", [dave])
  })
  it("a removed member's profile stops being readable, and they stop reading the family's", async () => {
    const frank = await makeUser("frank")
    await owner.query("insert into family_members (family_id, user_id) values ($1, $2)", [family, frank])
    expect(await count(alice, "profiles", "id = $1", [frank])).toBe(1)
    expect(await count(frank, "profiles", "id = $1", [alice])).toBe(1)
    await asUser(alice, (c) => c.query("delete from family_members where family_id = $1 and user_id = $2", [family, frank]))
    expect(await count(alice, "profiles", "id = $1", [frank])).toBe(0)
    expect(await count(frank, "profiles", "id = $1", [alice])).toBe(0)
    expect(await count(frank, "profiles")).toBe(1)
  })
  it("with no user set, no profile is readable, not even by id", async () => {
    expect(await count(null, "profiles", "id = $1", [alice])).toBe(0)
  })
  it("shares_family_with answers only for the caller", async () => {
    const ask = (userId: string | null, other: string) =>
      asUser(userId, async (c) => (await c.query("select shares_family_with($1) as s", [other])).rows[0].s)
    expect(await ask(alice, bob)).toBe(true)
    expect(await ask(dave, alice)).toBe(false)
    expect(await ask(null, alice)).toBe(false)
    await expect(authService.query("select shares_family_with($1)", [alice])).rejects.toThrow(/permission denied/)
  })
})
