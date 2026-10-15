import { describe, expect, it, vi } from "vitest"
import { createSender } from "@/components/onboarding/tour-events"
import type { TourEvent } from "@/lib/validations"

const a: TourEvent = { event: "walk_skipped" }
const b: TourEvent = { event: "peeked" }
const c: TourEvent = { event: "steps_hidden" }

describe("createSender", () => {
  it("sends each event", async () => {
    const post = vi.fn<(event: TourEvent) => Promise<boolean>>(async () => true)
    const send = createSender(post)
    await send(a)
    await send(b)
    expect(post.mock.calls.map(([e]) => e)).toEqual([a, b])
  })
  it("a failed event is sent again, first, with the next one", async () => {
    const results = [false, true, true]
    const post = vi.fn<(event: TourEvent) => Promise<boolean>>(async () => results.shift() ?? true)
    const send = createSender(post)
    await send(a) // fails
    await send(b) // a again, then b
    expect(post.mock.calls.map(([e]) => e)).toEqual([a, a, b])
  })
  it("stops at the first failure and keeps the order", async () => {
    const results = [false, false, true, true, true]
    const post = vi.fn<(event: TourEvent) => Promise<boolean>>(async () => results.shift() ?? true)
    const send = createSender(post)
    await send(a) // a fails
    await send(b) // a fails again; b is not tried
    await send(c) // a, b, c
    expect(post.mock.calls.map(([e]) => e)).toEqual([a, a, a, b, c])
  })
  it("never throws, even when the post does", async () => {
    const send = createSender(async () => {
      throw new Error("offline")
    })
    await expect(send(a)).resolves.toBeUndefined()
  })
  it("gives up on an event after five tries, so one bad event can't block the rest", async () => {
    const post = vi.fn(async (e: TourEvent) => e !== a)
    const send = createSender(post)
    for (let i = 0; i < 5; i++) await send(a)
    await send(b)
    const calls = post.mock.calls.map(([e]) => e)
    expect(calls[calls.length - 1]).toEqual(b)
    expect(calls.filter((e) => e === a).length).toBeLessThanOrEqual(10)
  })
})
