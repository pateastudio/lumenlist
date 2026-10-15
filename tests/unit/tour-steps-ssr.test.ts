import { createElement, createRef } from "react"
import { renderToString } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import type { TourData, TourState } from "@/types/tour"

// First Steps is drawn inside the signed-in layout, outside any Suspense boundary, so it is
// rendered on the server on every hard load. Nothing in its render may touch the browser.

const path = vi.hoisted(() => ({ now: "/dashboard" }))
vi.mock("next/navigation", () => ({ usePathname: () => path.now }))

const { Steps } = await import("@/components/onboarding/steps/steps")
type StepsControls = import("@/components/onboarding/steps/steps").StepsControls

const state: TourState = { walkEnded: true, peeked: false, secretSeen: false, hintsRead: [], stepsEnded: false, track: null, replay: false }

function render(pathname: string, data: TourData, over: Partial<TourState>) {
  path.now = pathname
  return renderToString(createElement(Steps, { data, state: { ...state, ...over }, send: () => {}, show: "full", controls: createRef<StepsControls>() }))
}

describe("First Steps on the server", () => {
  it("renders the family page while the invite hint is due (solo, a family, nobody in it yet)", () => {
    const solo: TourData = { userId: "u1", firstName: "Robin", giftCount: 0, familyCount: 1, firstFamily: { id: "f1", name: "The Vales" }, claimCount: 0, people: [] }
    const html = render("/families/f1", solo, { track: "solo" })
    expect(html).toContain("data-first-steps-launcher")
    // The hint waits for its anchor, which only the browser can find.
    expect(html).not.toContain("data-first-steps-hint")
  })

  it("renders someone's list while the dibs hint is due", () => {
    const invited: TourData = { userId: "u2", firstName: "Priya", giftCount: 0, familyCount: 1, firstFamily: { id: "f1", name: "The Harper Family" }, claimCount: 0, people: [{ id: "p1", name: "Sam Harper", familyId: "f1", openCount: 2 }] }
    expect(render("/members/p1", invited, { track: "invited" })).toContain("First steps")
  })

  it("renders before the track is fixed", () => {
    const fresh: TourData = { userId: "u3", firstName: "Robin", giftCount: 0, familyCount: 0, firstFamily: null, claimCount: 0, people: [] }
    expect(render("/gifts/new", fresh, {})).toContain("0 of 4")
  })
})
