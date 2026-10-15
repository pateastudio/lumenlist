import { describe, expect, it } from "vitest"
import { assertSeedTarget, demoTarget } from "../../scripts/seed/guard"
import { PROD_NEON_ENDPOINT } from "../e2e/support/guard"

const dev = "postgresql://u:p@ep-dev-123.c-1.us-west-2.aws.neon.tech/neondb"
const prod = `postgresql://u:p@${PROD_NEON_ENDPOINT}.c-1.us-west-2.aws.neon.tech/neondb`
const prodPooled = `postgresql://u:p@${PROD_NEON_ENDPOINT}-pooler.c-1.us-west-2.aws.neon.tech/neondb`

describe("assertSeedTarget", () => {
  it("allows the dev branch and a local database", () => {
    expect(() => assertSeedTarget({ ownerUrl: dev, appUrl: dev })).not.toThrow()
    expect(() => assertSeedTarget({ ownerUrl: "postgres://u:p@localhost:55432/neondb", appUrl: "postgres://u:p@localhost:55432/neondb" })).not.toThrow()
  })
  it("refuses the production Neon branch on either connection", () => {
    expect(() => assertSeedTarget({ ownerUrl: prod, appUrl: dev })).toThrow(/production/)
    expect(() => assertSeedTarget({ ownerUrl: dev, appUrl: prodPooled })).toThrow(/production/)
  })
  it("refuses a production hostname", () => {
    expect(() => assertSeedTarget({ ownerUrl: dev, appUrl: dev, baseURL: "https://lumenlist.app" })).toThrow(/production/)
  })
  it("refuses missing URLs", () => {
    expect(() => assertSeedTarget({ appUrl: dev })).toThrow()
    expect(() => assertSeedTarget({ ownerUrl: dev })).toThrow()
  })
})

describe("demoTarget", () => {
  it("lets the dev branch and a local database through without the flag", () => {
    expect(demoTarget({ ownerUrl: dev, production: false })).toBe("other")
    expect(demoTarget({ ownerUrl: "postgres://u:p@localhost:55432/neondb", production: false })).toBe("other")
  })
  it("refuses the production branch unless --production is given", () => {
    expect(() => demoTarget({ ownerUrl: prod, production: false })).toThrow(/--production/)
    expect(() => demoTarget({ ownerUrl: prodPooled, production: false })).toThrow(/--production/)
    expect(demoTarget({ ownerUrl: prod, production: true })).toBe("prod")
  })
  it("refuses --production against any other branch", () => {
    expect(() => demoTarget({ ownerUrl: dev, production: true })).toThrow(/not the production/)
  })
  it("refuses a missing URL", () => {
    expect(() => demoTarget({ production: false })).toThrow(/DEMO_DATABASE_URL/)
  })
})
