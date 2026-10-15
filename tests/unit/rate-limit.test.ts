import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// The database is replaced: takeRateLimit answers from an in-memory counter, and the routes'
// data calls are spies. The real counters are covered by tests/db/join-codes.test.ts.
const counts = new Map<string, number>()
vi.mock("@/lib/data/rate-limits", () => ({
  takeRateLimit: async (_tx: unknown, key: string, limit: number, windowSeconds: number) => {
    const n = (counts.get(key) ?? 0) + 1
    counts.set(key, n)
    return n <= limit ? { allowed: true, retryAfter: 0 } : { allowed: false, retryAfter: windowSeconds }
  },
}))
vi.mock("@/lib/db/with-user", () => ({
  withUser: (_id: string, fn: (tx: unknown) => unknown) => fn({}),
  withAnonymous: (fn: (tx: unknown) => unknown) => fn({}),
}))
vi.mock("@/lib/auth/user", () => ({ requireUser: async () => ({ id: "u1", email: "a@b.co", name: "A" }) }))
const joinFamily = vi.fn(async () => "fam-1")
vi.mock("@/lib/data/invites", () => ({ joinFamily, createInvite: async () => "token" }))
vi.mock("@/lib/data/families", () => ({ getFamily: async () => ({ name: "Fam" }) }))
vi.mock("@/lib/data/profiles", () => ({ getProfile: async () => ({ name: "A" }) }))
const sendInviteEmail = vi.fn(async () => {})
vi.mock("@/lib/resend", () => ({ sendInviteEmail }))

const { LIMITS, activeRules, hitLimits } = await import("@/lib/rate-limit")
const join = await import("@/app/api/join/[inviteCode]/route")
const invite = await import("@/app/api/families/[familyId]/invite/route")

const CODE = "0123456789abcdef0123456789abcdef"
const joinOnce = (headers: Record<string, string> = {}) =>
  join.POST(new Request(`http://x/api/join/${CODE}`, { method: "POST", headers }), { params: Promise.resolve({ inviteCode: CODE }) })
const inviteOnce = (familyId = "fam-1") =>
  invite.POST(
    new Request(`http://x/api/families/${familyId}/invite`, { method: "POST", body: JSON.stringify({ email: "x@test.invalid" }) }),
    { params: Promise.resolve({ familyId }) },
  )

beforeEach(() => { counts.clear(); joinFamily.mockClear(); sendInviteEmail.mockClear() })
afterEach(() => vi.unstubAllEnvs())

describe("rate limit rules", () => {
  it("per-IP rules apply in prod only; per-user and per-family rules everywhere", () => {
    const rules = LIMITS.invite("1.2.3.4", "u1", "f1")
    expect(activeRules(rules, "prod").map((r) => r.key)).toContain("invite:ip:1.2.3.4")
    for (const env of ["dev", "staging"] as const) {
      const keys = activeRules(rules, env).map((r) => r.key)
      expect(keys).not.toContain("invite:ip:1.2.3.4")
      expect(keys).toEqual(expect.arrayContaining(["invite:user:u1", "invite:user-day:u1", "invite:family-day:f1"]))
    }
    expect(activeRules(LIMITS.joinPreview("1.2.3.4"), "dev")).toEqual([])
  })
  it("returns the longest wait when several rules are over", async () => {
    const rules = [{ key: "a", limit: 1, windowSeconds: 60 }, { key: "b", limit: 1, windowSeconds: 600 }]
    expect(await hitLimits({} as never, rules)).toBeNull()
    expect(await hitLimits({} as never, rules)).toBe(600)
  })
})

describe("POST /api/join/<code>", () => {
  it("joins until the per-user limit, then answers 429 with Retry-After and stops calling join_family", async () => {
    for (let i = 0; i < 10; i++) expect((await joinOnce()).status).toBe(200)
    const res = await joinOnce()
    expect(res.status).toBe(429)
    expect(res.headers.get("retry-after")).toBe(String(15 * 60))
    expect(joinFamily).toHaveBeenCalledTimes(10)
  })
  it("refuses a request without a trustworthy address when CloudFront's secret is configured", async () => {
    vi.stubEnv("ORIGIN_VERIFY_SECRET", "s3cret")
    expect((await joinOnce({ "cloudfront-viewer-address": "1.2.3.4:5" })).status).toBe(403)
    expect(joinFamily).not.toHaveBeenCalled()
  })
  it("in prod, also limits by IP", async () => {
    vi.stubEnv("APP_ENV", "prod")
    vi.stubEnv("ORIGIN_VERIFY_SECRET", "s3cret")
    await joinOnce({ "x-origin-verify": "s3cret", "cloudfront-viewer-address": "198.51.100.10:443" })
    expect(counts.get("join:ip:198.51.100.10")).toBe(1)
  })
})

describe("POST /api/families/<id>/invite", () => {
  it("sends until the hourly per-user limit, then answers 429 and sends nothing", async () => {
    for (let i = 0; i < 10; i++) expect((await inviteOnce()).status).toBe(200)
    expect((await inviteOnce()).status).toBe(429)
    expect(sendInviteEmail).toHaveBeenCalledTimes(10)
  })
  it("caps one family per day, whoever sends", async () => {
    counts.set("invite:family-day:fam-2", 20)
    expect((await inviteOnce("fam-2")).status).toBe(429)
    expect(sendInviteEmail).not.toHaveBeenCalled()
  })
})
