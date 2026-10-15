// The tour's state is nobody else's business: each person reads and writes only their own row.
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { asUser, authService, makeUser, owner, reset } from "./helpers"
import { withUser } from "@/lib/db/with-user"
import { getTour, recordTourEvent } from "@/lib/data/onboarding"
import * as claims from "@/lib/data/claims"
import * as families from "@/lib/data/families"
import * as gifts from "@/lib/data/gifts"
import * as invites from "@/lib/data/invites"

let alice: string, bob: string

beforeAll(async () => {
  await reset()
  alice = await makeUser("alice")
  bob = await makeUser("bob")
  await asUser(alice, (c) => c.query("insert into onboarding (user_id) values ($1)", [alice]))
})

afterAll(async () => {
  await reset()
  await owner.end()
  await authService.end()
})

describe("onboarding policies", () => {
  it("a person reads their own row", async () => {
    const rows = await asUser(alice, async (c) => (await c.query("select user_id, hints_read from onboarding")).rows)
    expect(rows).toEqual([{ user_id: alice, hints_read: [] }])
  })
  it("nobody else sees it", async () => {
    expect(await asUser(bob, async (c) => (await c.query("select 1 from onboarding")).rowCount)).toBe(0)
  })
  it("with no user set there are no rows", async () => {
    expect(await asUser(null, async (c) => (await c.query("select 1 from onboarding")).rowCount)).toBe(0)
  })
  it("a person can't make a row for someone else", async () => {
    await expect(asUser(bob, (c) => c.query("insert into onboarding (user_id) values ($1)", [alice]))).rejects.toThrow(/row-level security|duplicate key/)
    await expect(asUser(alice, (c) => c.query("insert into onboarding (user_id) values ($1)", [bob]))).rejects.toThrow(/row-level security/)
  })
  it("a person can't change someone else's row", async () => {
    const changed = await asUser(bob, async (c) => (await c.query("update onboarding set walk_ended_at = now() where user_id = $1", [alice])).rowCount)
    expect(changed).toBe(0)
  })
  it("a person changes their own", async () => {
    const changed = await asUser(alice, async (c) => (await c.query("update onboarding set walk_ended_at = now(), walk_outcome = 'skipped' where user_id = $1", [alice])).rowCount)
    expect(changed).toBe(1)
  })
  it("an outcome outside the list is refused", async () => {
    await expect(asUser(alice, (c) => c.query("update onboarding set walk_outcome = 'bored' where user_id = $1", [alice]))).rejects.toThrow(/check constraint/)
  })
  it("auth_service can't read it", async () => {
    await expect(authService.query("select 1 from onboarding")).rejects.toThrow(/permission denied/)
  })
  it("the row goes when the profile goes", async () => {
    await owner.query(`delete from "user" where id = $1`, [alice])
    expect(Number((await owner.query("select count(*) from onboarding")).rows[0].count)).toBe(0)
  })
})

describe("recordTourEvent", () => {
  let carol: string
  const row = async () => (await owner.query("select * from onboarding where user_id = $1", [carol])).rows[0]
  const send = (event: Parameters<typeof recordTourEvent>[2]) => withUser(carol, (tx) => recordTourEvent(tx, carol, event))

  beforeAll(async () => {
    carol = await makeUser("carol")
  })

  it("makes the row on the first event", async () => {
    expect(await row()).toBeUndefined()
    await send({ event: "walk_skipped" })
    expect(await row()).toMatchObject({ walk_outcome: "skipped" })
    expect((await row()).walk_ended_at).not.toBeNull()
  })
  it("the first outcome wins", async () => {
    const before = await row()
    await send({ event: "walk_completed" })
    const after = await row()
    expect(after.walk_outcome).toBe("skipped")
    expect(after.walk_ended_at).toEqual(before.walk_ended_at)
  })
  it("the track is set once", async () => {
    await send({ event: "steps_shown", track: "invited" })
    await send({ event: "steps_shown", track: "solo" })
    expect((await row()).steps_track).toBe("invited")
  })
  it("peeked and secret_seen keep their first time", async () => {
    await send({ event: "peeked" })
    await send({ event: "secret_seen" })
    const first = await row()
    await send({ event: "peeked" })
    await send({ event: "secret_seen" })
    const second = await row()
    expect(second.peeked_at).toEqual(first.peeked_at)
    expect(second.secret_seen_at).toEqual(first.secret_seen_at)
    expect(first.peeked_at).not.toBeNull()
    expect(first.secret_seen_at).not.toBeNull()
  })
  it("a hint is recorded once", async () => {
    await send({ event: "hint_read", id: "add" })
    await send({ event: "hint_read", id: "add" })
    await send({ event: "hint_read", id: "dibs" })
    expect((await row()).hints_read).toEqual(["add", "dibs"])
  })
  it("hiding ends the steps, and completing afterwards doesn't rewrite it", async () => {
    await send({ event: "steps_hidden" })
    await send({ event: "steps_completed" })
    expect(await row()).toMatchObject({ steps_outcome: "hidden" })
    expect((await row()).steps_ended_at).not.toBeNull()
  })
  it("restart runs the walk and the steps again, keeps what they did, and marks the replay", async () => {
    const before = await row()
    expect(before.peeked_at).not.toBeNull()
    expect(before.secret_seen_at).not.toBeNull()
    await send({ event: "restart" })
    const after = await row()
    expect(after).toMatchObject({
      walk_ended_at: null, walk_outcome: null,
      hints_read: [], steps_ended_at: null, steps_outcome: null, steps_track: null,
    })
    // Looking at a list and opening the explainer are things they did: a replay does not undo them.
    expect(after.peeked_at).toEqual(before.peeked_at)
    expect(after.secret_seen_at).toEqual(before.secret_seen_at)
    expect(after.restarted_at).not.toBeNull()
  })
  it("writes only the caller's row", async () => {
    const dana = await makeUser("dana")
    await send({ event: "walk_completed" })
    expect((await owner.query("select count(*) from onboarding where user_id = $1", [dana])).rows[0].count).toBe("0")
  })
})

describe("getTour", () => {
  let erin: string, finn: string, gus: string, loner: string, fam: string, mug: string, socks: string
  const tour = (id: string, name = "Aunt Erin Example") => withUser(id, (tx) => getTour(tx, id, name))

  beforeAll(async () => {
    erin = await makeUser("erin"); finn = await makeUser("finn"); gus = await makeUser("gus"); loner = await makeUser("loner")
    fam = await withUser(erin, (tx) => families.createFamily(tx, "Fam"))
    // As tests/db/data.test.ts does it: an invite, then the invited person accepts.
    for (const [id, addr] of [[finn, "finn@test.invalid"], [gus, "gus@test.invalid"]] as const) {
      const token = await withUser(erin, (tx) => invites.createInvite(tx, fam, addr))
      expect(await withUser(id, (tx) => invites.acceptInvite(tx, token))).toBe(fam)
    }
    mug = (await withUser(erin, (tx) => gifts.createGift(tx, erin, { title: "Mug" }))).id
    socks = (await withUser(erin, (tx) => gifts.createGift(tx, erin, { title: "Socks" }))).id
    await withUser(gus, (tx) => gifts.createGift(tx, gus, { title: "Kite" }))
    await withUser(finn, (tx) => claims.claimGift(tx, mug, finn, "claimed"))
  })

  it("someone brand new, on their own", async () => {
    expect(await tour(loner, "Robin Vale")).toEqual({
      over: false,
      run: "",
      state: { walkEnded: false, peeked: false, secretSeen: false, hintsRead: [], stepsEnded: false, track: null, replay: false },
      data: { userId: loner, firstName: "Robin", giftCount: 0, familyCount: 0, firstFamily: null, claimCount: 0, people: [] },
    })
  })
  it("someone in a family sees the others and what is up for grabs", async () => {
    const info = await tour(finn, "Finn")
    if (info.over) throw new Error("expected a running tour")
    expect(info.data).toMatchObject({ giftCount: 0, familyCount: 1, firstFamily: { id: fam, name: "Fam" }, claimCount: 1 })
    const byName = Object.fromEntries(info.data.people.map((p) => [p.name, p]))
    expect(Object.keys(byName).sort()).toEqual(["erin", "gus"])
    // Erin has two gifts and Finn has claimed one of them: one is left.
    expect(byName.erin).toMatchObject({ id: erin, familyId: fam, openCount: 1 })
    expect(byName.gus).toMatchObject({ id: gus, openCount: 1 })
  })
  it("surprise: an owner learns nothing about claims on their own list", async () => {
    const info = await tour(erin)
    if (info.over) throw new Error("expected a running tour")
    // Her own two gifts are counted, claimed or not, and nothing else about them is returned.
    expect(info.data.giftCount).toBe(2)
    expect(info.data.claimCount).toBe(0)
    expect(info.data.people.map((p) => p.id).sort()).toEqual([finn, gus].sort())
    expect(info.data.people.some((p) => p.id === erin)).toBe(false)
    expect(JSON.stringify(info)).not.toContain(mug)

    // The check that can fail: someone claims another of her gifts, and what she is told is
    // exactly what she was told before. (Finn's claim on the mug is already in both.)
    const before = await tour(erin)
    await withUser(gus, (tx) => claims.claimGift(tx, socks, gus, "claimed"))
    try {
      // The claim is real: Finn, who may know, sees one fewer of her gifts up for grabs.
      const finnSees = await tour(finn, "Finn")
      expect(!finnSees.over && finnSees.data.people.find((p) => p.id === erin)?.openCount).toBe(0)
      expect(await tour(erin)).toEqual(before)
    } finally {
      // Put the family back as the other tests expect it.
      await withUser(gus, (tx) => claims.unclaimGift(tx, socks))
    }
  })
  it("keeps honorifics in the greeting, as Home does", async () => {
    const info = await tour(erin)
    expect(!info.over && info.data.firstName).toBe("Aunt Erin")
  })
  it("reports state from the row", async () => {
    await withUser(finn, (tx) => recordTourEvent(tx, finn, { event: "walk_skipped" }))
    await withUser(finn, (tx) => recordTourEvent(tx, finn, { event: "hint_read", id: "dibs" }))
    const info = await tour(finn, "Finn")
    expect(!info.over && info.state).toMatchObject({ walkEnded: true, hintsRead: ["dibs"], stepsEnded: false, replay: false })
  })
  it("is over once both parts have ended, and says nothing more", async () => {
    await withUser(finn, (tx) => recordTourEvent(tx, finn, { event: "steps_hidden" }))
    expect(await tour(finn, "Finn")).toEqual({ over: true, run: "" })
  })
  it("a restart starts a new run and marks the replay until the walk ends", async () => {
    await withUser(finn, (tx) => recordTourEvent(tx, finn, { event: "restart" }))
    const info = await tour(finn, "Finn")
    if (info.over) throw new Error("expected a running tour")
    expect(info.run).not.toBe("")
    expect(info.state).toMatchObject({ walkEnded: false, replay: true, hintsRead: [] })
    await withUser(finn, (tx) => recordTourEvent(tx, finn, { event: "walk_completed" }))
    const after = await tour(finn, "Finn")
    expect(!after.over && after.state.replay).toBe(false)
    expect(after.run).toBe(info.run)
  })
})
