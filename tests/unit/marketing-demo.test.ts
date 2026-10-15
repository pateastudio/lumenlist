import { describe, expect, it } from "vitest"
import { applyClaim, GIFT, giftsOf, initialGifts, ownGiftsOf, PEOPLE, shoppingOf, VIEWER } from "@/components/marketing/demo/family"

const AT = "2026-10-12T00:00:00.000Z"
const robe = GIFT.robe // up for grabs at the start
const cream = GIFT.cream // Dan has it at the start

describe("the made-up family", () => {
  it("names the gifts the page points at, and each one is the gift it says", () => {
    const titleOf = (id: string) => initialGifts().find((g) => g.id === id)?.title
    expect(titleOf(GIFT.robe)).toBe("Waffle-knit robe")
    expect(titleOf(GIFT.feeder)).toBe("Window bird feeder")
    expect(titleOf(GIFT.cream)).toBe("Lavender hand cream trio")
    expect(titleOf(GIFT.tulips)).toBe("Tulip bulbs, mixed colors")
  })
  it("has the people the page names, and nobody called a grandparent", () => {
    expect(PEOPLE.nora.name).toBe("Nora Harper")
    expect(VIEWER).toBe(PEOPLE.sam)
    expect(Object.values(PEOPLE).map((p) => p.name).join(" ")).not.toMatch(/grand/i)
  })
  it("has rows shaped like the app's", () => {
    const g = initialGifts()[0]
    expect(Object.keys(g).sort()).toEqual(
      ["created_at", "description", "external_id", "gift_claims", "id", "image_url", "owner_id", "price", "sort_order", "source", "title", "updated_at", "url"].sort(),
    )
    expect(g.image_url).toMatch(/^data:image\/svg\+xml/)
  })
  it("gives Nora six gifts in a mix of states", () => {
    const nora = giftsOf(initialGifts(), "nora")
    expect(nora).toHaveLength(6)
    expect(nora.filter((g) => !g.gift_claims).length).toBeGreaterThanOrEqual(2)
    expect(nora.some((g) => g.gift_claims?.claimed_by === VIEWER.id)).toBe(true)
    expect(nora.some((g) => g.gift_claims && g.gift_claims.claimed_by !== VIEWER.id)).toBe(true)
  })
})

describe("an owner's view carries no claim (surprise preservation)", () => {
  it("has no gift_claims key at all, before or after a claim", () => {
    const before = ownGiftsOf(initialGifts(), "nora")
    const after = ownGiftsOf(applyClaim(initialGifts(), robe, "POST", "claimed", AT), "nora")
    for (const g of [...before, ...after]) expect(g).not.toHaveProperty("gift_claims")
    expect(after).toEqual(before)
  })
})

describe("applyClaim", () => {
  it("claims an open gift for the visitor", () => {
    const next = applyClaim(initialGifts(), robe, "POST", "claimed", AT)
    expect(next.find((g) => g.id === robe)?.gift_claims).toMatchObject({ claimed_by: VIEWER.id, status: "claimed" })
    expect(shoppingOf(next).some((g) => g.id === robe)).toBe(true)
  })
  it("claiming twice is the same as claiming once", () => {
    const once = applyClaim(initialGifts(), robe, "POST", "claimed", AT)
    expect(applyClaim(once, robe, "POST", "claimed", AT)).toEqual(once)
  })
  it("never takes a gift someone else has", () => {
    const start = initialGifts()
    for (const method of ["POST", "PATCH", "DELETE"] as const) {
      expect(applyClaim(start, cream, method, "purchased", AT).find((g) => g.id === cream)?.gift_claims?.claimed_by).toBe(PEOPLE.dan.id)
    }
  })
  it("marks bought, un-marks, and lets go", () => {
    const mine = applyClaim(initialGifts(), robe, "POST", "claimed", AT)
    const bought = applyClaim(mine, robe, "PATCH", "purchased", AT)
    expect(bought.find((g) => g.id === robe)?.gift_claims?.status).toBe("purchased")
    expect(applyClaim(bought, robe, "PATCH", "claimed", AT).find((g) => g.id === robe)?.gift_claims?.status).toBe("claimed")
    expect(applyClaim(bought, robe, "DELETE", undefined, AT).find((g) => g.id === robe)?.gift_claims).toBeNull()
  })
  it("ignores a change to a gift that isn't claimed, or doesn't exist", () => {
    const start = initialGifts()
    expect(applyClaim(start, robe, "PATCH", "purchased", AT)).toEqual(start)
    expect(applyClaim(start, "nope", "POST", "claimed", AT)).toEqual(start)
  })
  it("does not change the list it was given", () => {
    const start = initialGifts()
    const copy = structuredClone(start)
    applyClaim(start, robe, "POST", "claimed", AT)
    expect(start).toEqual(copy)
  })
})
