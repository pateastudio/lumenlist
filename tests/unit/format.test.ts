import { describe, expect, it } from "vitest"
import { formatPrice, shortName } from "@/lib/format"

describe("formatPrice", () => {
  it.each([
    [68, "$68"],
    ["68", "$68"],
    ["68.00", "$68"],
    [14.99, "$14.99"],
    ["14.99", "$14.99"],
    [34.5, "$34.50"],
    ["34.50", "$34.50"],
    [1250, "$1,250"],
    ["1250.00", "$1,250"],
    [1234.5, "$1,234.50"],
    [0, "$0"],
  ])("formats %j as %s", (input, expected) => {
    expect(formatPrice(input)).toBe(expected)
  })

  it.each([[null], [undefined], [""], ["  "], ["abc"], [NaN], [Infinity], [-5]])("returns null for %j", (input) => {
    expect(formatPrice(input as never)).toBeNull()
  })
})

describe("shortName", () => {
  it("keeps the word after an honorific", () => {
    expect(shortName("Grandma Rose")).toBe("Grandma Rose")
    expect(shortName("Uncle Bob Smith")).toBe("Uncle Bob")
  })
  it("uses the first word otherwise", () => {
    expect(shortName("Dan Harper")).toBe("Dan")
    expect(shortName("Mom")).toBe("Mom")
    expect(shortName("Grandma")).toBe("Grandma")
  })
})
