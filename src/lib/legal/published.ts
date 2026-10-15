// The day the Privacy Policy and the Terms took effect, set by Patrick. If it were null, /privacy
// and /terms would answer 404 on every deployed environment, nothing would link to them, and
// sign-up would not mention them. Change it when a document changes: see docs/legal/PUBLISHING.md.
export const LEGAL_EFFECTIVE_DATE: string | null = "2026-10-13"

/** "YYYY-MM-DD" that is a real calendar day: "2026-02-31" is not. */
export function isValidLegalDate(date: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!m) return false
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const t = new Date(Date.UTC(y, mo - 1, d))
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d
}

// A bad date fails the build, rather than publishing the wrong day.
if (LEGAL_EFFECTIVE_DATE !== null && !isValidLegalDate(LEGAL_EFFECTIVE_DATE)) {
  throw new Error(`LEGAL_EFFECTIVE_DATE must be a real date as YYYY-MM-DD, got ${LEGAL_EFFECTIVE_DATE}`)
}

export function legalPublished(): boolean {
  return LEGAL_EFFECTIVE_DATE !== null
}

/** Published, or being read under `next dev` before publishing. */
export function legalVisible(): boolean {
  return legalPublished() || process.env.NODE_ENV === "development"
}

/** "October 20, 2026", for the line under each document's title. */
export function effectiveDateText(): string | null {
  if (!LEGAL_EFFECTIVE_DATE) return null
  const [y, m, d] = LEGAL_EFFECTIVE_DATE.split("-").map(Number)
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)))
}
