import { describe, expect, it } from "vitest"
import { buildSteps } from "@/components/onboarding/walk/stops"
import type { TourData } from "@/types/tour"

// The words on a stop need no page: only `find` looks at the document, and nothing here calls it.
const nowhere = {} as HTMLElement
const solo: TourData = { userId: "u", firstName: "Robin", giftCount: 0, familyCount: 0, firstFamily: null, claimCount: 0, people: [] }

describe("the walk's third stop for someone with nobody to share with yet", () => {
  it("offers to start a family when they have none", () => {
    const stop = buildSteps(solo)[2]
    expect(stop.title).toBe("Bring your people")
    expect(stop.body(nowhere)).toContain("Start a family here")
  })
  it("does not tell someone alone in their own family to start one", () => {
    const stop = buildSteps({ ...solo, familyCount: 1, firstFamily: { id: "f1", name: "The Vales" } })[2]
    expect(stop.title).toBe("Bring your people")
    expect(stop.body(nowhere)).toContain("Open your family here and send everyone the link")
    expect(stop.body(nowhere)).not.toContain("Start a family")
  })
})
