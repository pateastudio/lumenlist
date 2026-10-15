import { readFileSync } from "node:fs"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { parseLegal } from "@/lib/legal/markdown"

// What the pages look like once Patrick sets the date. The real date stays null; this pretends it
// is set, so the published state is tested before it ever ships.
vi.mock("@/lib/legal/published", () => ({
  LEGAL_EFFECTIVE_DATE: "2026-10-20",
  legalPublished: () => true,
  legalVisible: () => true,
  effectiveDateText: () => "October 20, 2026",
}))

const { LegalDocument } = await import("@/components/legal/legal-document")
const { LegalLine } = await import("@/components/legal/legal-line")
const { SiteFooter } = await import("@/components/marketing/site-footer")

const FILES = { privacy: "docs/legal/lumen-privacy-policy.md", terms: "docs/legal/lumen-terms-of-service.md" } as const

describe.each(["privacy", "terms"] as const)("the %s page once the date is set", (which) => {
  const title = (parseLegal(readFileSync(FILES[which], "utf8")).find((b) => b.type === "h1") as { text: string }).text
  const html = renderToStaticMarkup(createElement(LegalDocument, { which }))

  it("shows the effective date under the title", () => {
    expect(html).toContain("Effective October 20, 2026")
    expect(html).not.toContain("Not published yet")
  })
  it("shows the document's title", () => {
    expect(title.length).toBeGreaterThan(0)
    expect(html).toContain(`>${title.replaceAll("&", "&amp;")}</h1>`)
  })
})

describe("the sign-up line once the date is set", () => {
  const html = renderToStaticMarkup(createElement(LegalLine))
  it("agrees to both documents, with links", () => {
    expect(html).toContain("By creating an account you agree to the")
    expect(html).toContain('href="/terms"')
    expect(html).toContain('href="/privacy"')
  })
})

describe("the front page footer", () => {
  it("links both documents and carries the copyright line when they are published", () => {
    const html = renderToStaticMarkup(createElement(SiteFooter, { legal: true }))
    expect(html).toContain('href="/privacy"')
    expect(html).toContain('href="/terms"')
    expect(html).toContain("© 2026 Patea LLC")
  })
  it("has none of them when they are not", () => {
    const html = renderToStaticMarkup(createElement(SiteFooter, { legal: false }))
    expect(html).not.toContain("/privacy")
    expect(html).not.toContain("/terms")
    expect(html).not.toContain("Patea LLC")
  })
})
