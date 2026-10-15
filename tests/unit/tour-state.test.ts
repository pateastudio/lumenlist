import { describe, expect, it } from "vitest"
import { applyEvent, buildTasks, countWord, mergeState, phaseOf, pickPerson, trackFor } from "@/components/onboarding/tour-state"
import type { TourData, TourState } from "@/types/tour"

const fresh: TourState = { walkEnded: false, peeked: false, secretSeen: false, hintsRead: [], stepsEnded: false, track: null, replay: false }
const solo: TourData = { userId: "u", firstName: "Robin", giftCount: 0, familyCount: 0, firstFamily: null, claimCount: 0, people: [] }
const invited: TourData = {
  ...solo, firstName: "Priya", familyCount: 1, firstFamily: { id: "f1", name: "The Harpers" },
  people: [
    { id: "p1", name: "Sam Harper", familyId: "f1", openCount: 0 },
    { id: "p2", name: "Aunt Jo Harper", familyId: "f1", openCount: 2 },
  ],
}

describe("phaseOf", () => {
  it("walk, then steps, then over", () => {
    expect(phaseOf(fresh)).toBe("walk")
    expect(phaseOf({ ...fresh, walkEnded: true })).toBe("steps")
    expect(phaseOf({ ...fresh, walkEnded: true, stepsEnded: true })).toBe("over")
  })
  it("the walk comes first even if the steps were ended elsewhere", () => {
    expect(phaseOf({ ...fresh, stepsEnded: true })).toBe("walk")
  })
})

describe("applyEvent", () => {
  it("ending the walk never ticks a step", () => {
    const after = applyEvent(fresh, { event: "walk_completed" })
    expect(after).toEqual({ ...fresh, walkEnded: true })
    expect(buildTasks(invited, "invited", after).filter((t) => t.done)).toEqual([])
  })
  it("ending the walk ends a replay", () => {
    expect(applyEvent({ ...fresh, replay: true }, { event: "walk_skipped" })).toMatchObject({ walkEnded: true, replay: false })
  })
  it("the track is set once", () => {
    const a = applyEvent(fresh, { event: "steps_shown", track: "invited" })
    expect(applyEvent(a, { event: "steps_shown", track: "solo" }).track).toBe("invited")
  })
  it("a hint is kept once", () => {
    const a = applyEvent(fresh, { event: "hint_read", id: "dibs" })
    expect(applyEvent(a, { event: "hint_read", id: "dibs" }).hintsRead).toEqual(["dibs"])
  })
  it("peeked, secret_seen, steps_completed and steps_hidden", () => {
    expect(applyEvent(fresh, { event: "peeked" }).peeked).toBe(true)
    expect(applyEvent(fresh, { event: "secret_seen" }).secretSeen).toBe(true)
    expect(applyEvent(fresh, { event: "steps_completed" }).stepsEnded).toBe(true)
    expect(applyEvent(fresh, { event: "steps_hidden" }).stepsEnded).toBe(true)
  })
  it("restart runs the walk and the steps again as a replay, and keeps what they did", () => {
    const done: TourState = { walkEnded: true, peeked: true, secretSeen: true, hintsRead: ["add"], stepsEnded: true, track: "solo", replay: false }
    expect(applyEvent(done, { event: "restart" })).toEqual({ ...fresh, peeked: true, secretSeen: true, replay: true })
    // Nothing is ticked that they had not done.
    expect(applyEvent({ ...done, peeked: false, secretSeen: false }, { event: "restart" })).toEqual({ ...fresh, replay: true })
  })
  it("someone who has done everything has nothing left after a replay", () => {
    const all: TourState = { ...fresh, walkEnded: true, peeked: true, secretSeen: true, stepsEnded: true, track: "invited" }
    const after = applyEvent(all, { event: "restart" })
    const data = { ...invited, giftCount: 1, claimCount: 1 }
    expect(buildTasks(data, after.track ?? trackFor(data), after).filter((t) => !t.done)).toEqual([])
  })
})

describe("mergeState", () => {
  it("what the server knows is never undone by this tab", () => {
    const server: TourState = { ...fresh, walkEnded: true, stepsEnded: true, peeked: true, hintsRead: ["add"], track: "invited" }
    expect(mergeState(server, fresh)).toEqual(server)
  })
  it("what this tab just did survives a refresh that hasn't caught up", () => {
    const local: TourState = { ...fresh, walkEnded: true, secretSeen: true, hintsRead: ["dibs"], track: "solo" }
    expect(mergeState(fresh, local)).toEqual(local)
  })
  it("hints from both sides are kept once each", () => {
    expect(mergeState({ ...fresh, hintsRead: ["add", "dibs"] }, { ...fresh, hintsRead: ["dibs", "invite"] }).hintsRead).toEqual(["add", "dibs", "invite"])
  })
  it("the server's track wins when both have one", () => {
    expect(mergeState({ ...fresh, track: "invited" }, { ...fresh, track: "solo" }).track).toBe("invited")
  })
  it("a replay lasts only while neither side has ended the walk", () => {
    expect(mergeState({ ...fresh, replay: true }, { ...fresh, replay: true }).replay).toBe(true)
    expect(mergeState({ ...fresh, replay: true }, { ...fresh, walkEnded: true }).replay).toBe(false)
  })
})

describe("trackFor and pickPerson", () => {
  it("solo with nobody, invited with anybody", () => {
    expect(trackFor(solo)).toBe("solo")
    expect(trackFor(invited)).toBe("invited")
  })
  it("prefers the first person with something up for grabs", () => {
    expect(pickPerson(invited)).toMatchObject({ id: "p2", short: "Aunt Jo", href: "/members/p2?familyId=f1" })
  })
  it("falls back to the first person when nobody has anything", () => {
    const none = { ...invited, people: invited.people.map((p) => ({ ...p, openCount: 0 })) }
    expect(pickPerson(none)).toMatchObject({ id: "p1", short: "Sam" })
  })
  it("is null with nobody", () => {
    expect(pickPerson(solo)).toBeNull()
  })
})

describe("buildTasks", () => {
  it("invited: add, peek, dibs, secret", () => {
    const tasks = buildTasks(invited, "invited", fresh)
    expect(tasks.map((t) => t.id)).toEqual(["add", "peek", "dibs", "secret"])
    expect(tasks.map((t) => t.done)).toEqual([false, false, false, false])
    expect(tasks[1]).toMatchObject({ title: "Peek at Aunt Jo's list", href: "/members/p2?familyId=f1" })
    expect(tasks[2].href).toBe("/members/p2?familyId=f1")
    expect(tasks[3].href).toBeNull()
  })
  it("solo: add, family, invite (waiting), secret", () => {
    const tasks = buildTasks(solo, "solo", fresh)
    expect(tasks.map((t) => t.id)).toEqual(["add", "family", "invite", "secret"])
    expect(tasks[2]).toMatchObject({ waiting: true, href: null })
  })
  it("solo with a family: invite is no longer waiting", () => {
    const withFamily = { ...solo, familyCount: 1, firstFamily: { id: "f9", name: "Vale" } }
    const tasks = buildTasks(withFamily, "solo", fresh)
    expect(tasks[1].done).toBe(true)
    expect(tasks[2]).toMatchObject({ href: "/families/f9", done: false })
    expect(tasks[2].waiting).toBeFalsy()
  })
  it("ticks only from data and from what they did themselves", () => {
    const data = { ...invited, giftCount: 1, claimCount: 3 }
    const state = { ...fresh, walkEnded: true, peeked: true, secretSeen: true }
    expect(buildTasks(data, "invited", state).every((t) => t.done)).toBe(true)
  })
  it("the track does not reshuffle when the family empties", () => {
    const emptied = { ...invited, people: [] }
    const tasks = buildTasks(emptied, "invited", fresh)
    expect(tasks.map((t) => t.id)).toEqual(["add", "peek", "dibs", "secret"])
    expect(tasks[1]).toMatchObject({ title: "Peek at someone's list", href: "/families" })
    expect(tasks[2].href).toBe("/families")
  })
})

describe("countWord", () => {
  it("spells small counts", () => {
    expect([1, 2, 3, 4].map(countWord)).toEqual(["One", "Two", "Three", "Four"])
  })
})
