// Just enough Markdown for the two legal documents: a title, numbered section headings,
// paragraphs, bold, and bulleted lists. Anything else throws, so a line is never dropped or
// shown raw. No HTML passes through: the page builds elements from these blocks.

export type Inline = { text: string; bold: boolean }
export type Block = { type: "h1" | "h2"; text: string; id: string } | { type: "p"; inline: Inline[] } | { type: "ul"; items: Inline[][] }

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

const fail = (what: string, line: string): never => {
  throw new Error(`${what} in a legal document: ${line.slice(0, 60)}`)
}

function inline(text: string): Inline[] {
  // `_` is rejected outright as possible emphasis: neither document uses one. A bare `&` is fine
  // (it renders as text), but an entity such as &copy; would show raw, so it throws.
  if (/[\[\]<>`\\_]/.test(text) || /&[#a-zA-Z0-9]+;/.test(text)) fail("Unsupported markup", text)
  const parts = text.split("**")
  if (parts.length % 2 === 0) fail("Unclosed **", text)
  if (parts.some((t, i) => t.includes("*") || (i % 2 === 1 && t.trim() === ""))) fail("Unsupported emphasis", text)
  return parts.map((t, i) => ({ text: t, bold: i % 2 === 1 })).filter((p) => p.text !== "")
}

/** A heading is plain text: no bold, no markup, no closing #s. */
function heading(text: string, line: string): string {
  if (/#\s*$/.test(text) || inline(text).some((p) => p.bold)) fail("Unsupported heading", line)
  return text
}

const UNSUPPORTED_LINE = /^(\||\+\s|\d+[.)]\s|>|\*\s|=+$|_+$|-(?! ))/

export function parseLegal(markdown: string): Block[] {
  const blocks: Block[] = []
  let paragraph: string[] = []
  let list: string[] = []
  const ids = new Set<string>()
  const flush = () => {
    if (paragraph.length) blocks.push({ type: "p", inline: inline(paragraph.join(" ")) })
    if (list.length) blocks.push({ type: "ul", items: list.map(inline) })
    paragraph = []
    list = []
  }
  const push = (type: "h1" | "h2", text: string, raw: string) => {
    const id = slug(heading(text, raw))
    if (ids.has(id) || (type === "h1" && blocks.some((b) => b.type === "h1"))) fail("Duplicate heading", raw)
    ids.add(id)
    blocks.push({ type, text, id })
  }

  for (const raw of markdown.split("\n").map((l) => l.replace(/\s+$/, ""))) {
    if (raw === "") flush()
    else if (/^\s/.test(raw)) fail("Indented line", raw)
    else if (raw.startsWith("## ")) {
      flush()
      push("h2", raw.slice(3).trim(), raw)
    } else if (raw.startsWith("# ")) {
      flush()
      push("h1", raw.slice(2).trim(), raw)
    } else if (raw.startsWith("#") || UNSUPPORTED_LINE.test(raw)) fail("Unsupported line", raw)
    else if (raw.startsWith("- ")) {
      if (paragraph.length) flush()
      list.push(raw.slice(2).trim())
    } else {
      if (list.length) fail("Text directly after a list item", raw)
      paragraph.push(raw)
    }
  }
  flush()
  return blocks
}
