import { describe, expect, it, vi } from "vitest"
import { appPool, authPool } from "@/lib/db"

// pg-pool re-emits an idle client's socket error on the pool. With no listener that's an uncaught
// exception, and on Lambda an idle connection dropped by Neon (scale to zero, a pooler restart)
// would crash the container on its next request.
describe("database pools", () => {
  it.each([["app", appPool], ["auth", authPool]])("the %s pool survives an idle-client error", (_, pool) => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    expect(() => pool.emit("error", new Error("Connection terminated unexpectedly"))).not.toThrow()
    expect(log).toHaveBeenCalled()
    log.mockRestore()
  })
})
