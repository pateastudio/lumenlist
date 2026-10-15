import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// The (app) layout and each page used to call supabase.auth.getUser() separately: two network
// round trips to Supabase Auth per page, before any data. getCurrentUser() wraps it in React's
// cache() so one request makes one call. cache() only dedupes inside a server render, so this
// test guards the convention instead of the behavior.
function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return tsxFiles(path)
    return path.endsWith(".tsx") ? [path] : []
  })
}

describe("signed-in pages", () => {
  it.each(tsxFiles("src/app/(app)"))("%s gets the user through getCurrentUser()", (file) => {
    expect(readFileSync(file, "utf8")).not.toMatch(/auth\.getUser\(|auth\.api\.getSession\(/)
  })
})
