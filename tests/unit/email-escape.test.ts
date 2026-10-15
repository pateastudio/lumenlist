import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// User text in outgoing email (issue #153). Names and family names are whatever a person typed,
// and sign-up sends one before the address is verified, so the HTML must never carry their markup.
const sent: Array<{ subject: string; html: string }> = []
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: async (p: { subject: string; html: string }) => { sent.push(p); return { data: { id: "x" }, error: null } } }
  },
}))
const { escapeHtml, sendConfirmationEmail, sendInviteEmail } = await import("@/lib/resend")

const evil = '<a href="https://evil.example">x</a>'
const escaped = "&lt;a href=&quot;https://evil.example&quot;&gt;x&lt;/a&gt;"

beforeEach(() => { vi.stubEnv("APP_ENV", "prod"); vi.stubEnv("RESEND_API_KEY", "re_test") })
afterEach(() => { sent.length = 0; vi.unstubAllEnvs() })

describe("outgoing email", () => {
  it("escapes the characters that matter in HTML text and attributes", () => {
    expect(escapeHtml(`<b>"Tom" & 'Jo'</b>`)).toBe("&lt;b&gt;&quot;Tom&quot; &amp; &#39;Jo&#39;&lt;/b&gt;")
  })
  it("escapes the sign-up name in the confirmation email", async () => {
    await sendConfirmationEmail({ to: "a@example.com", name: evil, confirmUrl: "https://lumenlist.app/c?t=1&x=2" })
    expect(sent[0].html).toContain(`Hi ${escaped},`)
    expect(sent[0].html).not.toContain("evil.example\"")
    expect(sent[0].html).toContain('href="https://lumenlist.app/c?t=1&amp;x=2"')
  })
  it("escapes the inviter and family names in the invite HTML and keeps them plain in the subject", async () => {
    await sendInviteEmail({ to: "a@example.com", inviterName: evil, familyName: `${evil} & co`, inviteUrl: "https://lumenlist.app/invite/t" })
    expect(sent[0].html).toContain(`join ${escaped} &amp; co on Lumen`)
    expect(sent[0].html).toContain(`<p>${escaped} has invited you`)
    expect(sent[0].html).not.toContain("<a href=\"https://evil.example\">")
    expect(sent[0].subject).toBe(`${evil} invited you to join ${evil} & co on Lumen`)
  })
})
