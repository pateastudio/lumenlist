import { describe, expect, it } from "vitest"
import { assertSafeDatabase, assertSafeTarget, assertTestEmail, PROD_NEON_ENDPOINT } from "./guard"

describe("assertSafeTarget", () => {
  it("allows localhost and the non-prod hostnames", () => {
    for (const baseURL of ["http://localhost:3000", "https://dev.lumenlist.app", "https://staging.lumenlist.app"]) {
      expect(() => assertSafeTarget({ baseURL })).not.toThrow()
    }
  })
  it("refuses every production hostname", () => {
    for (const baseURL of ["https://lumenlist.app", "https://www.lumenlist.app/", "https://aws.lumenlist.app"]) {
      expect(() => assertSafeTarget({ baseURL })).toThrow(/production/)
    }
  })
})

describe("assertSafeDatabase", () => {
  it("refuses a missing URL", () => {
    expect(() => assertSafeDatabase(undefined)).toThrow()
  })
  it("refuses the production Neon branch, pooled or not", () => {
    if (!PROD_NEON_ENDPOINT) return // covered by the fail-closed test below
    expect(() => assertSafeDatabase(`postgresql://u:p@${PROD_NEON_ENDPOINT}.c-1.us-west-2.aws.neon.tech/neondb`)).toThrow(/production/)
    expect(() => assertSafeDatabase(`postgresql://u:p@${PROD_NEON_ENDPOINT}-pooler.c-1.us-west-2.aws.neon.tech/neondb`)).toThrow(/production/)
  })
  it("fails closed until the production endpoint is recorded", () => {
    if (PROD_NEON_ENDPOINT) return
    expect(() => assertSafeDatabase("postgresql://u:p@ep-dev-123.c-1.us-west-2.aws.neon.tech/neondb")).toThrow(/PROD_NEON_ENDPOINT/)
  })
  it("allows a non-production branch once the production endpoint is known", () => {
    if (!PROD_NEON_ENDPOINT) return
    expect(() => assertSafeDatabase("postgresql://u:p@ep-dev-123.c-1.us-west-2.aws.neon.tech/neondb")).not.toThrow()
  })
  it("allows a local test database", () => {
    expect(() => assertSafeDatabase("postgres://neondb_owner:test@localhost:55432/neondb")).not.toThrow()
  })
})

describe("assertTestEmail", () => {
  it("allows resend.dev test addresses", () => {
    expect(() => assertTestEmail("delivered+e2e-x-a@resend.dev")).not.toThrow()
  })
  it("refuses any other domain", () => {
    expect(() => assertTestEmail("someone@gmail.com")).toThrow()
    expect(() => assertTestEmail("x@resend.dev.evil.com")).toThrow()
  })
})
