import { readdirSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { SHELL } from "@/components/ui/toaster-client"

const dirs = readdirSync(join(process.cwd(), "src/app/(app)"), { withFileTypes: true })
  .filter((e) => e.isDirectory() && !/^[_(@]/.test(e.name))
  .map((e) => `/${e.name}`)

describe("toaster SHELL list", () => {
  it("names every signed-in top-level path", () => {
    for (const path of dirs) expect(SHELL).toContain(path)
  })

  it("names nothing that has no directory", () => {
    for (const path of SHELL) expect(dirs).toContain(path)
  })
})
