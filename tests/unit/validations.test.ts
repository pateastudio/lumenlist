import { describe, expect, it } from "vitest"
import {
  giftSchema,
  isHttpUrl,
  loginSchema,
  nextPathSchema,
  resetPasswordSchema,
  safeNextPath,
  scrapeUrlSchema,
  signupSchema,
} from "@/lib/validations"

describe("signupSchema", () => {
  it("accepts a valid signup", () => {
    expect(signupSchema.safeParse({ name: "A", email: "a@b.co", password: "12345678" }).success).toBe(true)
  })
  it("rejects a 7-character password", () => {
    expect(signupSchema.safeParse({ name: "A", email: "a@b.co", password: "1234567" }).success).toBe(false)
  })
  it("rejects an empty name and a 101-character name", () => {
    expect(signupSchema.safeParse({ name: "", email: "a@b.co", password: "12345678" }).success).toBe(false)
    expect(signupSchema.safeParse({ name: "x".repeat(101), email: "a@b.co", password: "12345678" }).success).toBe(false)
  })
})

describe("loginSchema", () => {
  it("rejects a malformed email", () => {
    expect(loginSchema.safeParse({ email: "not-an-email", password: "12345678" }).success).toBe(false)
  })
})

describe("resetPasswordSchema", () => {
  it("rejects mismatched passwords on confirmPassword", () => {
    const r = resetPasswordSchema.safeParse({ password: "12345678", confirmPassword: "87654321" })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].path).toEqual(["confirmPassword"])
  })
})

describe("giftSchema", () => {
  it("accepts a title-only gift", () => {
    expect(giftSchema.safeParse({ title: "Mug" }).success).toBe(true)
  })
  it("rejects a non-numeric price and a non-http url", () => {
    expect(giftSchema.safeParse({ title: "Mug", price: "abc" }).success).toBe(false)
    expect(giftSchema.safeParse({ title: "Mug", url: "ftp://x" }).success).toBe(false)
  })
  it("rejects a 1001-character description (the scraper caps at 1000)", () => {
    expect(giftSchema.safeParse({ title: "Mug", description: "x".repeat(1001) }).success).toBe(false)
    expect(giftSchema.safeParse({ title: "Mug", description: "x".repeat(1000) }).success).toBe(true)
  })
})

describe("giftSchema links (#155)", () => {
  const bad = ["javascript:alert(1)", "JavaScript:alert(1)", "data:text/html,hi", "httpfoo", "http", "//evil.example", "/gifts"]
  it("accepts http and https links in url and image_url", () => {
    for (const link of ["https://example.com/a?b=c", "http://example.com", "HTTPS://EXAMPLE.COM"]) {
      expect(giftSchema.safeParse({ title: "Mug", url: link, image_url: link }).success).toBe(true)
    }
  })
  it("rejects anything else in url", () => {
    for (const link of bad) expect(giftSchema.safeParse({ title: "Mug", url: link }).success, link).toBe(false)
  })
  it("rejects anything else in image_url", () => {
    for (const link of bad) expect(giftSchema.safeParse({ title: "Mug", image_url: link }).success, link).toBe(false)
  })
  it("still lets both be left empty", () => {
    expect(giftSchema.safeParse({ title: "Mug", url: "", image_url: "" }).success).toBe(true)
  })
  it("isHttpUrl agrees", () => {
    expect(isHttpUrl("https://example.com")).toBe(true)
    expect(isHttpUrl("javascript:alert(1)")).toBe(false)
  })
})

describe("safeNextPath (#155)", () => {
  it("keeps a path on this site", () => {
    for (const path of ["/dashboard", "/invite/abc123", "/join/ABCDEF", "/gifts?tab=mine#top", "/"]) {
      expect(safeNextPath(path)).toBe(path)
      expect(nextPathSchema.safeParse(path).success).toBe(true)
    }
  })
  it("falls back to /dashboard for anything that could leave the site", () => {
    const unsafe = [
      "//evil.example",
      "https://evil.example",
      "http://evil.example/dashboard",
      "/\\evil.example",
      "/\\/evil.example",
      "javascript:alert(1)",
      "JAVASCRIPT:alert(1)",
      "/\t/evil.example",
      "/\n/evil.example",
      "/ /evil.example",
      "evil.example",
      "dashboard",
      "",
    ]
    for (const value of unsafe) {
      expect(safeNextPath(value), JSON.stringify(value)).toBe("/dashboard")
      expect(nextPathSchema.safeParse(value).success, JSON.stringify(value)).toBe(false)
    }
  })
  it("falls back when there is no param, and honors a given fallback", () => {
    expect(safeNextPath(null)).toBe("/dashboard")
    expect(safeNextPath(undefined)).toBe("/dashboard")
    expect(safeNextPath("//evil.example", "/gifts")).toBe("/gifts")
  })
})

describe("scrapeUrlSchema", () => {
  it("requires http or https", () => {
    expect(scrapeUrlSchema.safeParse({ url: "https://example.com" }).success).toBe(true)
    expect(scrapeUrlSchema.safeParse({ url: "javascript:alert(1)" }).success).toBe(false)
  })
})
