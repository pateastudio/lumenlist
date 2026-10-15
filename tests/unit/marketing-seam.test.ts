import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// The marketing page's one seam: a claim button on an example card must reach the in-memory
// transport in DemoFamily and nothing else. If a provider for the claim transport appeared anywhere
// else, or the demo family were mounted on a signed-in page, example behaviour could leak into
// (or real claims be swallowed by) the wrong screen.
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(p) ? [p] : []
  })
}

const all = files("src").map((f) => f.replaceAll("\\", "/"))
const read = (f: string) => readFileSync(f, "utf8")

describe("the example seam", () => {
  it("finds the files it is meant to check", () => {
    expect(all.length).toBeGreaterThan(50)
  })

  it("provides the claim transport only in DemoFamily", () => {
    // React 19 lets the context itself act as a provider, so both spellings count.
    const providers = all.filter((f) => /ClaimTransportContext\.Provider|<ClaimTransportContext\b/.test(read(f)))
    expect(providers).toEqual(["src/components/marketing/demo/demo-family.tsx"])
  })

  it("mounts DemoFamily only on the front page", () => {
    const users = all.filter((f) => /\bDemoFamily\b/.test(read(f)) && /import[^;]*\bDemoFamily\b[^;]*from/.test(read(f)))
    for (const f of users) {
      expect(f === "src/app/page.tsx" || f.startsWith("src/components/marketing/")).toBe(true)
    }
    expect(users).toContain("src/app/page.tsx")
  })

  it("keeps Nora's own list inert", () => {
    // Her OwnGiftCards carry real Edit and Remove actions. `inert` on the wrapper that holds them
    // is what keeps them unreachable by pointer, keyboard and screen reader.
    const source = read("src/components/marketing/step-phone.tsx")
    expect(source).toMatch(/<div inert[^>]*>(?:(?!<\/div>)[\s\S])*<OwnGiftCard\b/)
  })
})
