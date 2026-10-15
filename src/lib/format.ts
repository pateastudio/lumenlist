/**
 * "$68", "$14.99", "$34.50", "$1,250". Whole-dollar amounts drop the cents.
 * Returns null for null, empty, non-numeric or negative input so callers can hide the price.
 */
export function formatPrice(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === "string" && value.trim() === "") return null
  const n = typeof value === "number" ? value : Number(value.replace(/[$,\s]/g, ""))
  if (!Number.isFinite(n) || n < 0) return null
  const whole = Number.isInteger(n)
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n)
}

const HONORIFICS = new Set(["grandma", "grandpa", "grandmother", "grandfather", "granny", "grandad", "aunt", "auntie", "uncle", "nana", "nanna", "papa", "gran", "mr", "mrs", "ms", "miss", "dr"])

/**
 * The name to use in "<name>'s list". Honorifics keep the next word ("Grandma Rose"),
 * otherwise the first word ("Dan Harper" -> "Dan"). Falls back to the whole string.
 */
export function shortName(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return fullName
  const first = words[0].replace(/\.$/, "").toLowerCase()
  if (HONORIFICS.has(first) && words.length > 1) return `${words[0]} ${words[1]}`
  return words[0]
}
