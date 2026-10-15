import { describe, expect, it } from "vitest"
import { config } from "@/proxy"

// Next compiles the matcher as a path regex anchored at both ends.
const matches = (path: string) =>
  config.matcher.some((m) => new RegExp(`^${m}$`).test(path))

describe("proxy matcher", () => {
  it("does not run the session refresh for the health check or static files", () => {
    expect(matches("/api/health")).toBe(false)
    expect(matches("/api/auth/sign-in/email")).toBe(false)
    expect(matches("/_next/static/chunks/app.js")).toBe(false)
    expect(matches("/favicon.ico")).toBe(false)
  })
  it("runs for pages and the other API routes", () => {
    expect(matches("/dashboard")).toBe(true)
    expect(matches("/api/gifts")).toBe(true)
    expect(matches("/")).toBe(true)
  })
})
