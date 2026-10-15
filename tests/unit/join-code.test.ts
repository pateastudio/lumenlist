import { describe, expect, it } from "vitest"
import { normalizeJoinCode } from "@/lib/join-code"

describe("normalizeJoinCode", () => {
  it("accepts new 32-character codes and old 12-character ones, in any case, trimmed", () => {
    expect(normalizeJoinCode("0123456789abcdef0123456789ABCDEF")).toBe("0123456789abcdef0123456789abcdef")
    expect(normalizeJoinCode(" ABCDEF123456 ")).toBe("abcdef123456")
  })
  it("accepts a hand-set 12-character code that isn't hex", () => {
    expect(normalizeJoinCode("lumenfamily1")).toBe("lumenfamily1")
  })
  it("refuses anything else", () => {
    for (const bad of ["", "abc", "abcdef12345", "abcdef1234567", "a".repeat(31), "a".repeat(33), "abcdef-12345", "abcdef12345%"]) {
      expect(normalizeJoinCode(bad)).toBeNull()
    }
  })
})
