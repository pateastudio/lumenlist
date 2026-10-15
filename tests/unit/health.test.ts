import { afterEach, describe, expect, it, vi } from "vitest"

const schemaStatus = vi.fn()
vi.mock("@/lib/health", () => ({ schemaStatus: () => schemaStatus() }))

const { GET } = await import("@/app/api/health/route")
const call = (auth?: string) => GET(new Request("http://x/api/health", auth ? { headers: { authorization: auth } } : {}))

afterEach(() => {
  vi.unstubAllEnvs()
  schemaStatus.mockReset()
})

describe("GET /api/health", () => {
  it("answers ok without touching the database when no token is sent", async () => {
    const res = await call()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: "ok" })
    expect(res.headers.get("cache-control")).toBe("no-store")
    expect(schemaStatus).not.toHaveBeenCalled()
  })
  it("says the deep check is off when no token is configured", async () => {
    expect(await (await call("Bearer x")).json()).toEqual({ status: "ok", deep: "disabled" })
  })
  it("refuses a wrong token", async () => {
    vi.stubEnv("HEALTH_TOKEN", "right")
    expect((await call("Bearer wrong")).status).toBe(401)
    expect(schemaStatus).not.toHaveBeenCalled()
  })
  it("reports the schema, and 503 when the database is behind", async () => {
    vi.stubEnv("HEALTH_TOKEN", "right")
    schemaStatus.mockResolvedValueOnce({ state: "current", applied: 2, expected: 2 })
    const ok = await call("Bearer right")
    expect(ok.status).toBe(200)
    expect(await ok.json()).toEqual({ status: "ok", database: "current", schemaVersion: 2, expectedSchemaVersion: 2 })
    schemaStatus.mockResolvedValueOnce({ state: "behind", applied: 1, expected: 2 })
    expect((await call("Bearer right")).status).toBe(503)
  })
  it("is 503 and says nothing more when the database is unreachable", async () => {
    vi.stubEnv("HEALTH_TOKEN", "right")
    schemaStatus.mockRejectedValueOnce(new Error("password authentication failed for user app_user"))
    const res = await call("Bearer right")
    expect(res.status).toBe(503)
    expect(await res.text()).not.toContain("password")
  })
})
