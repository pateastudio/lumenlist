// Join codes (#154): new codes are long, an owner can reset one, and the old code stops working.
// Plus the app's rate-limit counters, which app_user reaches only through take_rate_limit().
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { withAnonymous, withUser } from "@/lib/db/with-user"
import * as families from "@/lib/data/families"
import * as invites from "@/lib/data/invites"
import { takeRateLimit } from "@/lib/data/rate-limits"
import { hitLimits } from "@/lib/rate-limit"
import { asUser, makeUser, owner, reset } from "./helpers"

let alice: string, bob: string, dave: string, fam: string

beforeAll(async () => {
  await reset()
  await owner.query("truncate app_rate_limit")
  alice = await makeUser("alice"); bob = await makeUser("bob"); dave = await makeUser("dave")
  fam = await withUser(alice, (tx) => families.createFamily(tx, "Fam"))
  await owner.query("insert into family_members (family_id, user_id) values ($1, $2)", [fam, bob])
})
afterAll(async () => { await reset(); await owner.query("truncate app_rate_limit"); await owner.end() })

const codeOf = async (id: string) => (await owner.query("select invite_code from families where id = $1", [id])).rows[0].invite_code

describe("join codes", () => {
  it("a new family gets a 32-character hex code", async () => {
    expect(await codeOf(fam)).toMatch(/^[0-9a-f]{32}$/)
  })
  it("an old 12-character code keeps working until it is reset", async () => {
    // As 0005 made them, or as set by hand.
    await owner.query("update families set invite_code = 'Abc123def456' where id = $1", [fam])
    expect(await withAnonymous((tx) => invites.joinPreview(tx, "abc123def456"))).toEqual({ family_id: fam, family_name: "Fam" })
    expect(await withUser(dave, (tx) => invites.joinFamily(tx, "abc123def456"))).toBe(fam)
    await owner.query("delete from family_members where family_id = $1 and user_id = $2", [fam, dave])
  })
  it("the owner resets it; the old code stops working and the new one works", async () => {
    const old = await codeOf(fam)
    const fresh = await withUser(alice, (tx) => families.resetJoinCode(tx, fam))
    expect(fresh).toMatch(/^[0-9a-f]{32}$/)
    expect(fresh).not.toBe(old)
    expect(await codeOf(fam)).toBe(fresh)
    expect(await withAnonymous((tx) => invites.joinPreview(tx, old))).toBeNull()
    expect(await withUser(dave, (tx) => invites.joinFamily(tx, old))).toBeNull()
    expect(await withUser(dave, (tx) => invites.joinFamily(tx, fresh!))).toBe(fam)
    await owner.query("delete from family_members where family_id = $1 and user_id = $2", [fam, dave])
  })
  it("people already in stay in after a reset", async () => {
    await withUser(alice, (tx) => families.resetJoinCode(tx, fam))
    expect(await withUser(bob, (tx) => families.isMember(tx, fam, bob))).toBe(true)
  })
  it("a member, an outsider and nobody can't reset it", async () => {
    const before = await codeOf(fam)
    expect(await withUser(bob, (tx) => families.resetJoinCode(tx, fam))).toBeNull()
    expect(await withUser(dave, (tx) => families.resetJoinCode(tx, fam))).toBeNull()
    expect(await withAnonymous((tx) => families.resetJoinCode(tx, fam))).toBeNull()
    expect(await codeOf(fam)).toBe(before)
  })
})

describe("take_rate_limit", () => {
  it("allows up to the limit, then says how long to wait", async () => {
    for (let i = 0; i < 3; i++) {
      expect(await withAnonymous((tx) => takeRateLimit(tx, "t:a", 3, 600))).toEqual({ allowed: true, retryAfter: 0 })
    }
    const over = await withAnonymous((tx) => takeRateLimit(tx, "t:a", 3, 600))
    expect(over.allowed).toBe(false)
    expect(over.retryAfter).toBeGreaterThan(590)
    expect(over.retryAfter).toBeLessThanOrEqual(600)
  })
  it("keeps keys apart", async () => {
    expect((await withAnonymous((tx) => takeRateLimit(tx, "t:b", 3, 600))).allowed).toBe(true)
  })
  it("starts a new window once the old one is over", async () => {
    await owner.query("update app_rate_limit set reset_at = now() - interval '1 second' where key = 't:a'")
    expect(await withAnonymous((tx) => takeRateLimit(tx, "t:a", 3, 600))).toEqual({ allowed: true, retryAfter: 0 })
    expect((await owner.query("select count from app_rate_limit where key = 't:a'")).rows[0].count).toBe(1)
  })
  it("works signed in too", async () => {
    expect((await withUser(alice, (tx) => takeRateLimit(tx, "t:c", 1, 60))).allowed).toBe(true)
    expect((await withUser(alice, (tx) => takeRateLimit(tx, "t:c", 1, 60))).allowed).toBe(false)
  })
  it("refuses nonsense arguments", async () => {
    await expect(withAnonymous((tx) => takeRateLimit(tx, "", 1, 60))).rejects.toThrow()
    await expect(withAnonymous((tx) => takeRateLimit(tx, "t:d", 0, 60))).rejects.toThrow()
    await expect(withAnonymous((tx) => takeRateLimit(tx, "t:d", 1, 0))).rejects.toThrow()
  })
  it("app_user can't read or write the counters directly", async () => {
    await expect(asUser(alice, (c) => c.query("select * from app_rate_limit"))).rejects.toThrow(/permission denied/)
    await expect(asUser(alice, (c) => c.query("delete from app_rate_limit"))).rejects.toThrow(/permission denied/)
    await expect(asUser(null, (c) => c.query("update app_rate_limit set count = 0"))).rejects.toThrow(/permission denied/)
  })
  it("a rolled-back request doesn't count", async () => {
    await expect(withAnonymous(async (tx) => {
      await takeRateLimit(tx, "t:e", 5, 60)
      throw new Error("refused")
    })).rejects.toThrow("refused")
    expect((await owner.query("select count(*) from app_rate_limit where key = 't:e'")).rows[0].count).toBe("0")
  })
})

describe("hitLimits", () => {
  const rules = [
    { key: "h:user", limit: 2, windowSeconds: 60 },
    { key: "h:ip", limit: 1, windowSeconds: 60, ipOnly: true },
  ]
  it("skips per-IP rules outside prod and counts every rule that applies", async () => {
    // APP_ENV is unset here, so this is dev.
    expect(await withAnonymous((tx) => hitLimits(tx, rules))).toBeNull()
    expect(await withAnonymous((tx) => hitLimits(tx, rules))).toBeNull()
    expect(await withAnonymous((tx) => hitLimits(tx, rules))).toBeGreaterThan(0)
    expect((await owner.query("select count(*) from app_rate_limit where key = 'h:ip'")).rows[0].count).toBe("0")
  })
})
