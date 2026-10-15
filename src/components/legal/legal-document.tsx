import { readFileSync } from "node:fs"
import { join } from "node:path"
import { notFound } from "next/navigation"
import { effectiveDateText, legalVisible } from "@/lib/legal/published"
import { parseLegal, type Inline } from "@/lib/legal/markdown"

const FILES = { privacy: "lumen-privacy-policy.md", terms: "lumen-terms-of-service.md" } as const

const text = (parts: Inline[]) => parts.map((p, i) => (p.bold ? <strong key={i}>{p.text}</strong> : p.text))

/**
 * One legal document, rendered from its Markdown file in docs/legal at build time. 404 until the
 * effective date is set (it shows under `next dev`, marked as not published, so it can be read).
 */
export function LegalDocument({ which }: { which: keyof typeof FILES }) {
  // Read at build time only: the deployed bundle has no docs/ folder, so the pages must stay force-static.
  if (!legalVisible()) notFound()
  const blocks = parseLegal(readFileSync(join(process.cwd(), "docs", "legal", FILES[which]), "utf8"))
  const date = effectiveDateText()

  return (
    <article className="mx-auto w-full max-w-[42rem] px-4 py-10 text-lg leading-relaxed sm:px-6 lg:py-16">
      {blocks.map((b, i) => {
        if (b.type === "ul") {
          return (
            <ul key={i} className="mt-4 list-disc space-y-2 pl-6">
              {b.items.map((item, j) => (
                <li key={j}>{text(item)}</li>
              ))}
            </ul>
          )
        }
        if (b.type === "p") {
          return (
            <p key={i} className="mt-4">
              {text(b.inline)}
            </p>
          )
        }
        if (b.type === "h1") {
          return (
            <header key={i} className="mb-8">
              <h1 className="font-display text-4xl leading-tight font-(weight:--display-weight) tracking-(--display-tracking) text-balance sm:text-5xl">{b.text}</h1>
              <p className="mt-3 text-base text-muted-foreground">{date ? `Effective ${date}` : "Not published yet. This preview shows only under next dev."}</p>
            </header>
          )
        }
        return (
          <h2 key={i} id={b.id} className="mt-10 scroll-mt-6 font-display text-2xl leading-snug font-(weight:--display-weight)">
            {b.text}
          </h2>
        )
      })}
    </article>
  )
}
