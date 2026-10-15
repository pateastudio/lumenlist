import { randomBytes } from "node:crypto"
import { describe, expect, it, vi } from "vitest"
vi.mock("server-only", () => ({}))
vi.mock("@/lib/db", () => ({ authDb: {} }))
vi.mock("better-auth/adapters/drizzle", () => ({ drizzleAdapter: () => () => ({}) }))
vi.mock("@/lib/resend", () => ({ sendAlreadyRegisteredEmail: vi.fn(), sendPasswordResetEmail: vi.fn(), sendConfirmationEmail: vi.fn() }))

describe("auth configuration", () => {
  it("encodes the spec's session and sign-up decisions", async () => {
    const { auth } = await import("@/lib/auth/server")
    const o = auth.options
    expect(o.session?.expiresIn).toBe(60 * 60 * 24 * 30)
    expect(o.session?.cookieCache).toEqual({ enabled: true, maxAge: 300 })
    expect(o.emailAndPassword?.requireEmailVerification).toBe(true)
    expect(o.emailAndPassword?.revokeSessionsOnPasswordReset).toBe(true)
    expect(o.advanced?.database?.generateId).toBe("uuid")
    expect(o.advanced?.ipAddress?.ipAddressHeaders).toEqual(["x-lumenlist-client-ip"])
  })
  it("rate-limits in prod only", async () => {
    vi.resetModules()
    vi.stubEnv("APP_ENV", "prod")
    expect((await import("@/lib/auth/server")).auth.options.rateLimit).toMatchObject({ enabled: true, storage: "database" })
    vi.resetModules()
    vi.stubEnv("APP_ENV", "dev")
    expect((await import("@/lib/auth/server")).auth.options.rateLimit?.enabled).toBe(false)
    vi.unstubAllEnvs()
  })
  it("verifies Supabase's bcrypt hashes", async () => {
    const { auth } = await import("@/lib/auth/server")
    // A real bcrypt hash at cost 10, of a password made for this run.
    const password = randomBytes(15).toString("base64url")
    const hash = await (await import("bcryptjs")).default.hash(password, 10)
    expect(await auth.options.emailAndPassword!.password!.verify!({ hash, password })).toBe(true)
    expect(await auth.options.emailAndPassword!.password!.verify!({ hash, password: "wrong" })).toBe(false)
  })
})
