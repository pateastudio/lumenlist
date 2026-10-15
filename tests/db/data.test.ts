import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { withUser } from "@/lib/db/with-user"
import * as claims from "@/lib/data/claims"
import * as families from "@/lib/data/families"
import * as gifts from "@/lib/data/gifts"
import * as invites from "@/lib/data/invites"
import * as profiles from "@/lib/data/profiles"
import { makeUser, owner, reset } from "./helpers"

let alice: string, bob: string, dave: string, fam: string, mug: string

beforeAll(async () => {
  await reset()
  alice = await makeUser("alice"); bob = await makeUser("bob"); dave = await makeUser("dave")
  fam = await withUser(alice, (tx) => families.createFamily(tx, "Fam"))
  const token = await withUser(alice, (tx) => invites.createInvite(tx, fam, "bob@test.invalid"))
  expect(await withUser(bob, (tx) => invites.acceptInvite(tx, token))).toBe(fam)
  mug = (await withUser(alice, (tx) => gifts.createGift(tx, alice, { title: "Mug", price: 12.5 }))).id
  await withUser(bob, (tx) => claims.claimGift(tx, mug, bob, "claimed"))
})
afterAll(async () => { await reset(); await owner.end() })

describe("data layer", () => {
  it("own gifts never carry claims, and price is a number", async () => {
    const list = await withUser(alice, (tx) => gifts.listOwnGifts(tx, alice))
    expect(list).toHaveLength(1)
    expect(list[0]).not.toHaveProperty("gift_claims")
    expect(list[0].price).toBe(12.5)
    expect(typeof list[0].created_at).toBe("string")
  })
  it("a family member sees the claim; the owner viewing their own list through the other path sees none", async () => {
    expect((await withUser(bob, (tx) => gifts.listGiftsWithClaims(tx, alice)))[0].gift_claims?.claimed_by).toBe(bob)
    expect((await withUser(alice, (tx) => gifts.listGiftsWithClaims(tx, alice)))[0].gift_claims).toBeNull()
  })
  it("an outsider gets nothing", async () => {
    expect(await withUser(dave, (tx) => gifts.listGiftsWithClaims(tx, alice))).toEqual([])
    expect(await withUser(dave, (tx) => families.getFamilyWithMembers(tx, fam))).toBeNull()
  })
  it("profiles: your own and your family's, nobody else's (#160)", async () => {
    expect((await withUser(dave, (tx) => profiles.getProfile(tx, dave)))?.name).toBe("dave")
    expect((await withUser(bob, (tx) => profiles.getProfile(tx, alice)))?.name).toBe("alice")
    expect(await withUser(dave, (tx) => profiles.getProfile(tx, alice))).toBeNull()
    expect((await withUser(alice, (tx) => families.fellowMembers(tx, alice, 50))).map((m) => m.profiles.name)).toEqual(["bob"])
  })
  it("family with members has the old shape", async () => {
    const f = await withUser(bob, (tx) => families.getFamilyWithMembers(tx, fam))
    expect(f?.family_members.map((m) => m.profiles.name).sort()).toEqual(["alice", "bob"])
  })
  it("my families come with a member count", async () => {
    expect(await withUser(bob, (tx) => families.listMyFamilies(tx, bob))).toMatchObject([{ id: fam, member_count: 2 }])
  })
  it("recent claims include the gift", async () => {
    expect((await withUser(bob, (tx) => claims.recentClaimsBy(tx, bob, 5)))[0].gifts?.title).toBe("Mug")
  })
  it("previews work signed out", async () => {
    const code = (await owner.query("select invite_code from families where id = $1", [fam])).rows[0].invite_code
    const { withAnonymous } = await import("@/lib/db/with-user")
    expect(await withAnonymous((tx) => invites.joinPreview(tx, code))).toEqual({ family_id: fam, family_name: "Fam" })
  })
})
