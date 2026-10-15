import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// The marketing page is static and public: it reads no session and no data, and calls no API.
function files(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(p) ? [p] : []
  })
}

describe("the marketing page reads nothing", () => {
  const all = [...files("src/components/marketing"), "src/app/page.tsx"]

  it("finds the files it is meant to check", () => {
    expect(all.length).toBeGreaterThan(1)
  })

  it.each(all)("%s", (file) => {
    const s = readFileSync(file, "utf8")
    expect(s).not.toMatch(/@\/lib\/data|@\/lib\/db|@\/lib\/auth|next\/headers|cookies\(\)/)
    expect(s).not.toMatch(/fetch\(\s*[`"']\/api\//)
  })
})
