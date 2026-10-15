import { readFileSync } from "node:fs"
import { afterEach, describe, expect, it, vi } from "vitest"
import { parseLegal } from "@/lib/legal/markdown"
import { isValidLegalDate } from "@/lib/legal/published"
import { LegalDocument } from "@/components/legal/legal-document"

const FILES = ["docs/legal/lumen-privacy-policy.md", "docs/legal/lumen-terms-of-service.md"]
const read = (f: string) => readFileSync(f, "utf8")

describe("parseLegal", () => {
  it("reads headings, paragraphs, bold and lists", () => {
    const blocks = parseLegal(["# Title", "", "## 1. First part", "", "Plain **bold** plain.", "Same paragraph.", "", "- one", "- **two** more", "", "Last."].join("\n"))
    expect(blocks).toEqual([
      { type: "h1", text: "Title", id: "title" },
      { type: "h2", text: "1. First part", id: "1-first-part" },
      { type: "p", inline: [{ text: "Plain ", bold: false }, { text: "bold", bold: true }, { text: " plain. Same paragraph.", bold: false }] },
      { type: "ul", items: [[{ text: "one", bold: false }], [{ text: "two", bold: true }, { text: " more", bold: false }]] },
      { type: "p", inline: [{ text: "Last.", bold: false }] },
    ])
  })
  it("refuses anything it does not know, so nothing is silently dropped", () => {
    for (const bad of ["### too deep", "> a quote", "1. a numbered list", "a [link](x)", "<b>html</b>", "`code`"]) {
      expect(() => parseLegal(bad)).toThrow()
    }
  })
  it.each([
    ["bold in a heading", "## 1. **Bold** title"],
    ["a link in a heading", "## See [x](y)"],
    ["a closing # on a heading", "## Title ##"],
    ["an indented continuation", "Para\n  more"],
    ["a nested list item", "- one\n  - two"],
    ["a tab-indented line", "\ttext"],
    ["a wrapped list item", "- one\ncontinued"],
    ["single-star emphasis", "a *word* b"],
    ["an empty bold span", "a **** b"],
    ["underscore emphasis", "an _word_ here"],
    ["double underscore emphasis", "an __word__ here"],
    ["a backslash", "a \\* b"],
    ["an HTML entity", "&copy; 2026"],
    ["a table row", "| a | b |"],
    ["a plus list", "+ item"],
    ["a numbered list with a parenthesis", "1) item"],
    ["a # with no space", "#Title"],
    ["three #", "### Deep"],
    ["a setext underline", "Title\n====="],
    ["an underscore rule", "___"],
    ["a dash rule", "---"],
    ["a dash then a tab", "-\titem"],
    ["a second title", "# One\n\n# Two"],
    ["a duplicate section id", "## 1. A\n\n## 1. A"],
  ])("refuses %s", (_what, bad) => {
    expect(() => parseLegal(bad)).toThrow()
  })

  it("keeps what it handles: bold across a line join, Windows line endings, addresses, quotes and a bare &", () => {
    const blocks = parseLegal('# T\r\n\r\nSome **bold\r\nacross** lines at hello@pateastudio.com and https://lumenlist.app/x?a=1 said "you & us" isn\'t   \r\n\r\n   \r\n- item & more\r\n')
    expect(blocks[0]).toEqual({ type: "h1", text: "T", id: "t" })
    expect(blocks[1]).toEqual({
      type: "p",
      inline: [
        { text: "Some ", bold: false },
        { text: "bold across", bold: true },
        { text: ' lines at hello@pateastudio.com and https://lumenlist.app/x?a=1 said "you & us" isn\'t', bold: false },
      ],
    })
    expect(blocks[2]).toEqual({ type: "ul", items: [[{ text: "item & more", bold: false }]] })
  })
})

describe.each(FILES)("%s", (file) => {
  const text = read(file)
  it("has no placeholder", () => {
    expect(text).not.toMatch(/[\[\]]/)
    expect(text).not.toMatch(/\b(TBD|TODO|XXX|lorem)\b/i)
    expect(text).not.toMatch(/draft|counsel|Job Tracker|Keepers/i)
  })
  it("parses whole, with one title and numbered sections", () => {
    const blocks = parseLegal(text)
    expect(blocks.filter((b) => b.type === "h1")).toHaveLength(1)
    const sections = blocks.filter((b) => b.type === "h2").map((b) => (b as { text: string }).text)
    expect(sections.length).toBeGreaterThanOrEqual(12)
    sections.forEach((s, i) => expect(s.startsWith(`${i + 1}. `)).toBe(true))
    const ids = blocks.filter((b) => b.type === "h2").map((b) => (b as { id: string }).id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  it("names Patea LLC and the contact address", () => {
    expect(text).toContain("Patea LLC")
    expect(text).toContain("hello@pateastudio.com")
  })
})

describe("publishing", () => {
  afterEach(() => vi.unstubAllEnvs())

  it("is published, with the date Patrick set", async () => {
    const { LEGAL_EFFECTIVE_DATE, legalPublished, effectiveDateText } = await import("@/lib/legal/published")
    // Only Patrick sets the date. Change this test with it.
    expect(LEGAL_EFFECTIVE_DATE).toBe("2026-10-13")
    expect(legalPublished()).toBe(true)
    expect(effectiveDateText()).toBe("October 13, 2026")
  })
  it("is visible in every environment once published", async () => {
    const { legalVisible } = await import("@/lib/legal/published")
    for (const env of ["development", "production", "test"]) {
      vi.stubEnv("NODE_ENV", env)
      expect(legalVisible()).toBe(true)
    }
  })
})

describe("the date validator", () => {
  it("accepts real days and refuses the rest", () => {
    for (const ok of ["2026-10-20", "2028-02-29"]) expect(isValidLegalDate(ok)).toBe(true)
    for (const bad of ["2026-02-31", "2026-13-01", "2026-00-10", "2027-02-29", "2026-1-1", "October 20, 2026", ""]) expect(isValidLegalDate(bad)).toBe(false)
  })
})

describe.each(["privacy", "terms"] as const)("the %s page", (which) => {
  afterEach(() => vi.unstubAllEnvs())

  it("renders in a production build, now that it is published", () => {
    vi.stubEnv("NODE_ENV", "production")
    expect(LegalDocument({ which })).toBeTruthy()
  })
  it("renders under next dev too", () => {
    vi.stubEnv("NODE_ENV", "development")
    expect(LegalDocument({ which })).toBeTruthy()
  })
})
