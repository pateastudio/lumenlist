import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// Every signed-in page is dynamic and per user, so a prefetched <Link> costs a full Lambda request
// with its Supabase calls. Next prefetches every visible link, and on Lambda that burst of 10 to 20
// requests started cold instances, which made clicks take 2 to 3 seconds (2026-10-08). Links in
// the signed-in area must opt out. The public pages (front page, auth, legal) do the same:
// they are static or light, and a burst of prefetches buys nothing.
const roots = ["src/app/(app)", "src/components/shared", "src/components/gifts", "src/components/family", "src/components/dashboard", "src/components/onboarding", "src/components/marketing", "src/components/auth", "src/components/legal", "src/app/page.tsx", "src/app/(legal)"]

function tsxFiles(dir: string): string[] {
  if (statSync(dir).isFile()) return dir.endsWith(".tsx") ? [dir] : []
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return tsxFiles(path)
    return path.endsWith(".tsx") ? [path] : []
  })
}

describe("links in the signed-in area and on the public pages", () => {
  const files = roots.flatMap(tsxFiles)

  it("finds the files it is meant to check", () => {
    expect(files.length).toBeGreaterThan(10)
  })

  it.each(files)("%s: every <Link> sets prefetch={false}", (file) => {
    const source = readFileSync(file, "utf8")
    // An opening <Link ...> tag, possibly spanning lines, up to its first `>`.
    const tags = source.match(/<Link\b[^>]*>/g) ?? []
    const missing = tags.filter((tag) => !/prefetch=\{false\}/.test(tag))
    expect(missing).toEqual([])
  })
})
