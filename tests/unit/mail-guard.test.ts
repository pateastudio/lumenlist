import { afterEach, describe, expect, it, vi } from "vitest"
import { guardRecipient } from "@/lib/mail-guard"

afterEach(() => vi.unstubAllEnvs())

describe("guardRecipient", () => {
  it("passes mail through untouched in prod", () => {
    vi.stubEnv("APP_ENV", "prod")
    expect(guardRecipient("aunt@example.com", "Hi")).toEqual({ to: "aunt@example.com", subject: "Hi" })
  })
  it("redirects to the allowlist outside prod and says who it was for", () => {
    vi.stubEnv("APP_ENV", "staging"); vi.stubEnv("NON_PROD_MAIL_TO", "me@example.com")
    expect(guardRecipient("aunt@example.com", "Hi")).toEqual({ to: "me@example.com", subject: "[staging] Hi (for aunt@example.com)" })
  })
  it("keeps an allowlisted recipient", () => {
    vi.stubEnv("APP_ENV", "dev"); vi.stubEnv("NON_PROD_MAIL_TO", "a@example.com,b@example.com")
    expect(guardRecipient("b@example.com", "Hi")).toEqual({ to: "b@example.com", subject: "[dev] Hi" })
  })
  it("lets resend.dev test addresses through, so the e2e suite works", () => {
    vi.stubEnv("APP_ENV", "dev"); vi.stubEnv("NON_PROD_MAIL_TO", "me@example.com")
    expect(guardRecipient("delivered+x@resend.dev", "Hi")?.to).toBe("delivered+x@resend.dev")
  })
  it("sends nothing outside prod when the allowlist is unset", () => {
    vi.stubEnv("APP_ENV", "dev")
    expect(guardRecipient("aunt@example.com", "Hi")).toBeNull()
  })
  it("treats an unknown or missing APP_ENV as dev", () => {
    vi.stubEnv("APP_ENV", "")
    expect(guardRecipient("aunt@example.com", "Hi")).toBeNull()
  })
})
