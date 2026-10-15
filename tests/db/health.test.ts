import { describe, expect, it } from "vitest"
import { schemaStatus } from "@/lib/health"

describe("schemaStatus (as app_user, against the real migrations)", () => {
  it("is current right after migrating", async () => {
    expect((await schemaStatus()).state).toBe("current")
  })
})
