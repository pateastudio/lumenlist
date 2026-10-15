import { describe, expect, it } from "vitest"
import { decodeCopyValue, parseCopyText } from "../../scripts/import/copy"

describe("decodeCopyValue", () => {
  it.each([
    ["\\N", null],
    ["plain", "plain"],
    ["tab\\there", "tab\there"],
    ["line\\nbreak", "line\nbreak"],
    ["back\\\\slash", "back\\slash"],
    ["cr\\r", "cr\r"],
    ["octal\\101", "octalA"],
    ["hex\\x41", "hexA"],
    ["", ""],
  ])("%j", (raw, want) => expect(decodeCopyValue(raw)).toBe(want))
})

describe("parseCopyText", () => {
  it("reads every COPY block into rows keyed by column", () => {
    const text = [
      "SET statement_timeout = 0;",
      "COPY public.gifts (id, title, description) FROM stdin;",
      "g1\tMug\t\\N",
      "g2\tBook\\twith tab\tA \\\\ note",
      "\\.",
      "",
      "COPY auth.users (id, email) FROM stdin;",
      "u1\ta@example.com",
      "\\.",
    ].join("\n")
    const t = parseCopyText(text)
    expect(t.get("public.gifts")).toEqual([
      { id: "g1", title: "Mug", description: null },
      { id: "g2", title: "Book\twith tab", description: "A \\ note" },
    ])
    expect(t.get("auth.users")).toEqual([{ id: "u1", email: "a@example.com" }])
  })
  it("keeps an empty table as an empty list", () => {
    expect(parseCopyText("COPY public.family_invites (id) FROM stdin;\n\\.\n").get("public.family_invites")).toEqual([])
  })
  it("refuses a row with the wrong number of fields", () => {
    expect(() => parseCopyText("COPY public.x (a, b) FROM stdin;\nonly-one\n\\.\n")).toThrow(/public\.x/)
  })
})
