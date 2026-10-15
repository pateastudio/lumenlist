// Parses `pg_restore -f -` output: every `COPY schema.table (cols) FROM stdin;` block into rows.
// COPY text format: tab-separated, \N is null, backslash escapes for \b \f \n \r \t \v \\,
// octal \NNN and hex \xHH.

const SIMPLE: Record<string, string> = { b: "\b", f: "\f", n: "\n", r: "\r", t: "\t", v: "\v", "\\": "\\" }

export function decodeCopyValue(raw: string): string | null {
  if (raw === "\\N") return null
  return raw.replace(/\\(x[0-9a-fA-F]{1,2}|[0-7]{1,3}|.)/g, (_, esc: string) => {
    if (esc[0] === "x") return String.fromCharCode(parseInt(esc.slice(1), 16))
    if (/^[0-7]/.test(esc)) return String.fromCharCode(parseInt(esc, 8))
    return SIMPLE[esc] ?? esc
  })
}

export function parseCopyText(text: string): Map<string, Record<string, string | null>[]> {
  const tables = new Map<string, Record<string, string | null>[]>()
  let table: string | null = null
  let cols: string[] = []
  for (const line of text.split("\n")) {
    if (table === null) {
      const m = /^COPY ([\w.]+) \((.*)\) FROM stdin;$/.exec(line)
      if (m) {
        table = m[1]
        cols = m[2].split(",").map((c) => c.trim().replace(/^"|"$/g, ""))
        tables.set(table, [])
      }
      continue
    }
    if (line === "\\.") {
      table = null
      continue
    }
    const fields = line.split("\t")
    if (fields.length !== cols.length) throw new Error(`${table}: expected ${cols.length} fields, got ${fields.length}`)
    tables.get(table)!.push(Object.fromEntries(cols.map((c, i) => [c, decodeCopyValue(fields[i])])))
  }
  return tables
}
