import { afterEach, describe, expect, it, vi } from "vitest"

// The Better Auth handler is replaced by a spy, so the test sees exactly what reaches it.
const seen: Request[] = []
vi.mock("@/lib/auth/server", () => ({ auth: {} }))
vi.mock("better-auth/next-js", () => ({
  toNextJsHandler: () => ({
    GET: async (r: Request) => { seen.push(r); return new Response("ok") },
    POST: async (r: Request) => { seen.push(r); return new Response("ok") },
  }),
}))
const { GET, POST } = await import("@/app/api/auth/[...all]/route")

afterEach(() => { seen.length = 0; vi.unstubAllEnvs() })

describe("/api/auth/*", () => {
  it("refuses a request that didn't come through CloudFront, before Better Auth sees it", async () => {
    vi.stubEnv("ORIGIN_VERIFY_SECRET", "s3cret")
    const res = await POST(new Request("http://x/api/auth/sign-in/email", {
      method: "POST",
      headers: { "cloudfront-viewer-address": "1.2.3.4:5", "x-lumenlist-client-ip": "9.9.9.9" },
      body: "{}",
    }))
    expect(res.status).toBe(403)
    expect(seen).toHaveLength(0)
  })
  it("passes CloudFront's viewer IP to Better Auth, replacing any client-sent copy, and keeps the body", async () => {
    vi.stubEnv("ORIGIN_VERIFY_SECRET", "s3cret")
    const res = await POST(new Request("http://x/api/auth/sign-in/email", {
      method: "POST",
      headers: { "x-origin-verify": "s3cret", "cloudfront-viewer-address": "198.51.100.10:443", "x-lumenlist-client-ip": "9.9.9.9" },
      body: '{"email":"a@b.co"}',
    }))
    expect(res.status).toBe(200)
    expect(seen[0].headers.get("x-lumenlist-client-ip")).toBe("198.51.100.10")
    expect(await seen[0].text()).toBe('{"email":"a@b.co"}')
  })
  it("treats a local run (no secret) as one user", async () => {
    await GET(new Request("http://x/api/auth/get-session"))
    expect(seen[0].headers.get("x-lumenlist-client-ip")).toBe("127.0.0.1")
  })
  // Under OpenNext on Lambda the incoming request is not this runtime's own Request instance, and
  // `new Request(request, init)` throws "Cannot read private member #state" on it (dev, 2026-10-08).
  it("works with a request object from another Request implementation", async () => {
    vi.stubEnv("ORIGIN_VERIFY_SECRET", "s3cret")
    const real = new Request("http://x/api/auth/sign-up/email", {
      method: "POST",
      headers: { "x-origin-verify": "s3cret", "cloudfront-viewer-address": "198.51.100.10:443" },
      body: '{"email":"a@b.co"}',
    })
    const foreign = {
      url: real.url,
      method: real.method,
      headers: real.headers,
      body: real.body,
      arrayBuffer: () => real.arrayBuffer(),
      text: () => real.text(),
    } as unknown as Request
    const res = await POST(foreign)
    expect(res.status).toBe(200)
    expect(seen[0].headers.get("x-lumenlist-client-ip")).toBe("198.51.100.10")
    expect(await seen[0].text()).toBe('{"email":"a@b.co"}')
  })
})
