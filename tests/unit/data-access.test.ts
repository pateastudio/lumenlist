import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// Pages, routes and components reach the database only through src/lib/data, inside withUser()
// or withAnonymous(). Nothing outside lib imports the pools, Drizzle, raw pg or Supabase.
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(p) ? [p] : []
  })
}

describe("database access", () => {
  it.each([...files("src/app"), ...files("src/components")])("%s", (file) => {
    const s = readFileSync(file, "utf8")
    // withUser()/withAnonymous() (@/lib/db/with-user) are the sanctioned way in; the pools,
    // Drizzle and raw pg are not.
    expect(s).not.toMatch(/@\/lib\/db"|@\/lib\/db\/index|from "pg"|drizzle-orm|@supabase\/|@\/lib\/supabase\//)
  })
})
