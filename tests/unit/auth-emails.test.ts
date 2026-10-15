import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Better Auth's email hooks. Sends run after the response (Next's after()), never throw into the
// request, and an account whose owner never confirmed it can always get a fresh link.
const deferred: Array<() => Promise<unknown>> = []
vi.mock("next/server", async (orig) => ({ ...(await orig<object>()), after: (fn: () => Promise<unknown>) => { deferred.push(fn) } }))
vi.mock("@/lib/db", () => ({ authDb: {} }))
vi.mock("better-auth/adapters/drizzle", () => ({ drizzleAdapter: () => () => ({}) }))
const mail = { sendAlreadyRegisteredEmail: vi.fn(), sendPasswordResetEmail: vi.fn(), sendConfirmationEmail: vi.fn() }
vi.mock("@/lib/resend", () => mail)

const { auth } = await import("@/lib/auth/server")
const sendVerificationEmail = vi.spyOn(auth.api, "sendVerificationEmail").mockResolvedValue({ status: true } as never)
const user = (emailVerified: boolean) => ({ id: "u1", email: "a@example.com", name: "A", emailVerified }) as never
const runDeferred = async () => { for (const fn of deferred.splice(0)) await fn() }

beforeEach(() => { Object.values(mail).forEach((m) => m.mockReset()); sendVerificationEmail.mockClear() })
afterEach(() => vi.restoreAllMocks)

describe("an unconfirmed account can always recover", () => {
  it("signing in before confirming sends a fresh confirmation link", () => {
    expect(auth.options.emailVerification?.sendOnSignIn).toBe(true)
  })
  it("signing up again with an unconfirmed email sends a fresh confirmation, not 'already registered'", async () => {
    await auth.options.emailAndPassword!.onExistingUserSignUp!({ user: user(false) })
    await runDeferred()
    expect(sendVerificationEmail).toHaveBeenCalledWith(expect.objectContaining({ body: expect.objectContaining({ email: "a@example.com" }) }))
    expect(mail.sendAlreadyRegisteredEmail).not.toHaveBeenCalled()
  })
  it("signing up again with a confirmed email sends 'already registered'", async () => {
    await auth.options.emailAndPassword!.onExistingUserSignUp!({ user: user(true) })
    await runDeferred()
    expect(mail.sendAlreadyRegisteredEmail).toHaveBeenCalled()
    expect(sendVerificationEmail).not.toHaveBeenCalled()
  })
})

describe("email sends", () => {
  it("run after the response and never throw into it when Resend fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    mail.sendPasswordResetEmail.mockRejectedValue(new Error("Resend send failed: suspended"))
    await expect(auth.options.emailAndPassword!.sendResetPassword!({ user: user(true), url: "u", token: "t" })).resolves.toBeUndefined()
    expect(mail.sendPasswordResetEmail).not.toHaveBeenCalled() // deferred, not inline
    await expect(runDeferred()).resolves.toBeUndefined()
    expect(mail.sendPasswordResetEmail).toHaveBeenCalled()
    expect(log).toHaveBeenCalled()
  })
  it("hand Better Auth's own background work to after() too", () => {
    expect(typeof auth.options.advanced?.backgroundTasks?.handler).toBe("function")
  })
})

// The sign-up form's limit is only in the browser, and Better Auth takes any length (issue #153).
describe("a person's name is capped on the server", () => {
  const long = "x".repeat(101)
  it("refuses an oversize name at sign-up, before the email is looked up", async () => {
    await expect(auth.api.signUpEmail({ body: { name: long, email: "a@example.com", password: "Password-1!" } }))
      .rejects.toMatchObject({ statusCode: 400, body: expect.objectContaining({ message: expect.stringContaining("100") }) })
  })
  it("refuses an oversize name on update-user, and lets one at the limit through to the session check", async () => {
    await expect(auth.api.updateUser({ body: { name: long }, headers: new Headers() }))
      .rejects.toMatchObject({ statusCode: 400 })
    await expect(auth.api.updateUser({ body: { name: "x".repeat(100) }, headers: new Headers() }))
      .rejects.toMatchObject({ statusCode: 401 })
  })
})
