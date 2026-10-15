import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const getSession = vi.fn()
vi.mock("@/lib/auth/server", () => ({ auth: { api: { getSession: (...a: unknown[]) => getSession(...a) } } }))

const { proxy } = await import("@/proxy")

const COOKIE = "better-auth.session_token=abc.def"
const request = (path: string, cookie?: string) => new NextRequest(`https://lumenlist.app${path}`, { headers: cookie ? { cookie } : {} })

// Braces matter: vitest runs a function returned from beforeEach as cleanup, and mockReset() returns the mock.
beforeEach(() => { getSession.mockReset() })

describe("the proxy at /", () => {
  it("lets a visitor with no session cookie through without reading the session", async () => {
    const res = await proxy(request("/"))
    expect(res.headers.get("location")).toBeNull()
    expect(getSession).not.toHaveBeenCalled()
  })
  it("sends a signed-in person to Home", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } })
    const res = await proxy(request("/", COOKIE))
    expect(res.status).toBeGreaterThanOrEqual(300)
    expect(new URL(res.headers.get("location")!).pathname).toBe("/dashboard")
    expect(res.headers.get("cache-control")).toBe("private, no-store")
  })
  it("shows the page to someone whose cookie is stale or invalid", async () => {
    getSession.mockResolvedValue(null)
    const res = await proxy(request("/", COOKIE))
    expect(res.headers.get("location")).toBeNull()
  })
  it("shows the page if the session check throws", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    getSession.mockRejectedValue(new Error("database is asleep"))
    const res = await proxy(request("/", COOKIE))
    expect(res.headers.get("location")).toBeNull()
    expect(log).toHaveBeenCalled()
    log.mockRestore()
  })
  it("does not treat other public pages that way", async () => {
    getSession.mockResolvedValue({ headers: new Headers(), response: { user: { id: "u1" } } })
    for (const path of ["/login", "/signup", "/privacy", "/terms", "/join/abcdefabcdef"]) {
      const res = await proxy(request(path, COOKIE))
      expect(res.headers.get("location")).toBeNull()
    }
    expect(getSession).not.toHaveBeenCalled()
  })
  it("still protects the signed-in pages", async () => {
    getSession.mockResolvedValue({ headers: new Headers(), response: null })
    const res = await proxy(request("/gifts"))
    const to = new URL(res.headers.get("location")!)
    expect(to.pathname).toBe("/login")
    expect(to.searchParams.get("next")).toBe("/gifts")
  })
})
