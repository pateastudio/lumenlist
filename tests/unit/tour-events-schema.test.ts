import { describe, expect, it } from "vitest"
import { tourEventSchema } from "@/lib/validations"

describe("tour events", () => {
  it.each([
    { event: "walk_completed" },
    { event: "walk_skipped" },
    { event: "steps_shown", track: "invited" },
    { event: "steps_shown", track: "solo" },
    { event: "peeked" },
    { event: "secret_seen" },
    { event: "hint_read", id: "add" },
    { event: "hint_read", id: "dibs" },
    { event: "hint_read", id: "invite" },
    { event: "steps_completed" },
    { event: "steps_hidden" },
    { event: "restart" },
  ])("accepts %j", (body) => {
    expect(tourEventSchema.safeParse(body).success).toBe(true)
  })

  it.each([
    {},
    { event: "walk_ended" },
    { event: "hint_read" },
    { event: "hint_read", id: "anything" },
    { event: "steps_shown" },
    { event: "steps_shown", track: "vip" },
    "walk_completed",
    null,
  ])("refuses %j", (body) => {
    expect(tourEventSchema.safeParse(body).success).toBe(false)
  })

  it("drops fields a client has no business setting", () => {
    const parsed = tourEventSchema.parse({ event: "walk_completed", walk_ended_at: "1999-01-01", user_id: "someone-else" })
    expect(parsed).toEqual({ event: "walk_completed" })
  })
})
