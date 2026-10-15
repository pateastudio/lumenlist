import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// `?next=` comes from the address bar, so anyone can set it. Every place that reads it must pass
// it through safeNextPath before it reaches router.replace or a callbackURL (#155), or a link
// like /login?next=https://evil.example sends someone who just signed in to another site.

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.tsx?$/.test(path) ? [path] : []
  })
}

const READS_NEXT = /\.get\(\s*["'](next|callbackURL|callbackUrl|redirect|redirectTo|returnTo)["']\s*\)/g

describe("the next param", () => {
  const readers = sourceFiles("src").filter((path) => readFileSync(path, "utf8").match(READS_NEXT) !== null)

  it("is read by the login and signup forms", () => {
    expect(readers.sort()).toEqual(["src/components/auth/login-form.tsx", "src/components/auth/signup-form.tsx"])
  })

  it("only ever goes through safeNextPath", () => {
    for (const path of readers) {
      const source = readFileSync(path, "utf8")
      const reads = [...source.matchAll(READS_NEXT)].length
      const checked = [...source.matchAll(/safeNextPath\(\s*\w+\.get\(\s*["']\w+["']\s*\)\s*\)/g)].length
      expect(checked, path).toBe(reads)
    }
  })
})
