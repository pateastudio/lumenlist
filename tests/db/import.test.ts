import pg from "pg"
import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { loadSnapshot, type Snapshot } from "../../scripts/import/load"
import { verifySnapshot } from "../../scripts/import/verify"
import { owner, reset } from "./helpers"

const app = new pg.Pool({ connectionString: process.env.TEST_APP_URL })
const A = "11111111-1111-1111-1111-111111111111", B = "22222222-2222-2222-2222-222222222222"
const F = "33333333-3333-3333-3333-333333333333", G = "44444444-4444-4444-4444-444444444444"
const ts = "2026-09-01 12:00:00+00"
const snap = (): Snapshot => ({
  users: [A, B].map((id, i) => ({ id, name: `U${i}`, email: `u${i}@test.invalid`, email_verified: i === 0, created_at: ts, updated_at: ts })),
  accounts: [A, B].map((id) => ({ account_id: id, provider_id: "credential" as const, user_id: id, password: "$2a$10$" + "x".repeat(53), created_at: ts, updated_at: ts })),
  app: {
    profiles: [A, B].map((id, i) => ({ id, email: `u${i}@test.invalid`, name: `U${i}`, avatar_url: null, created_at: ts, updated_at: ts })),
    families: [{ id: F, name: "Fam", created_by: A, invite_code: "abcdefabcdef", created_at: ts, updated_at: ts }],
    family_members: [
      { id: "55555555-5555-5555-5555-555555555555", family_id: F, user_id: A, role: "owner", joined_at: ts },
      { id: "66666666-6666-6666-6666-666666666666", family_id: F, user_id: B, role: "member", joined_at: ts },
    ],
    family_invites: [{ id: "77777777-7777-7777-7777-777777777777", family_id: F, invited_by: A, email: "x@test.invalid", token: "tok", accepted_at: null, expires_at: ts, created_at: ts }],
    gifts: [{ id: G, owner_id: A, title: "Mug\twith tab", description: null, price: "12.50", url: null, image_url: null, sort_order: "0", source: "manual", external_id: null, created_at: ts, updated_at: ts }],
    gift_claims: [{ id: "88888888-8888-8888-8888-888888888888", gift_id: G, claimed_by: B, status: "purchased", created_at: ts, updated_at: ts }],
  },
})

beforeEach(async () => { await reset() })
afterAll(async () => { await reset(); await app.end(); await owner.end() })

describe("import", () => {
  it("loads everything once, without trigger duplicates, and verifies clean", async () => {
    const c = await owner.connect()
    try {
      await loadSnapshot(c, snap())
      expect(await verifySnapshot(c, app, snap())).toEqual([])
      expect((await c.query("select count(*)::int as n from family_members")).rows[0].n).toBe(2)
      expect((await c.query("select title from gifts")).rows[0].title).toBe("Mug\twith tab")
      expect((await c.query("select password from account where user_id = $1", [A])).rows[0].password).toBe(snap().accounts[0].password)
    } finally { c.release() }
  })
  it("refuses a target that already has users", async () => {
    const c = await owner.connect()
    try {
      await loadSnapshot(c, snap())
      await expect(loadSnapshot(c, snap())).rejects.toThrow(/not empty/)
    } finally { c.release() }
  })
  it("rolls back completely when any row fails", async () => {
    const bad = snap()
    bad.app.gift_claims[0].gift_id = "99999999-9999-9999-9999-999999999999" // no such gift
    const c = await owner.connect()
    try {
      await expect(loadSnapshot(c, bad)).rejects.toThrow()
      expect((await c.query(`select count(*)::int as n from "user"`)).rows[0].n).toBe(0)
    } finally { c.release() }
  })
  it("verification reports a table whose count doesn't match the dump", async () => {
    const c = await owner.connect()
    try {
      await loadSnapshot(c, snap())
      const more = snap()
      more.app.gifts.push({ ...more.app.gifts[0], id: "99999999-9999-9999-9999-999999999999" })
      expect(await verifySnapshot(c, app, more)).toContain("gifts: 1 rows, expected 2")
    } finally { c.release() }
  })
  it("verification reports a user without a bcrypt credential", async () => {
    const c = await owner.connect()
    try {
      await loadSnapshot(c, snap())
      await c.query("update account set password = 'not-a-hash' where user_id = $1", [A])
      expect(await verifySnapshot(c, app, snap())).toContain("1 users without exactly one bcrypt credential")
    } finally { c.release() }
  })
  it("verification reports a user who can't read their own profile", async () => {
    const C = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
    const s = snap()
    s.users.push({ ...s.users[0], id: C, email: "c@test.invalid" })
    s.accounts.push({ ...s.accounts[0], account_id: C, user_id: C })
    s.app.profiles.push({ ...s.app.profiles[0], id: C, email: "c@test.invalid" })
    const c = await owner.connect()
    try {
      await loadSnapshot(c, s)
      await c.query("delete from profiles where id = $1", [C])
      expect(await verifySnapshot(c, app, s)).toContain(`user ${C} can't read their own profile`)
    } finally { c.release() }
  })
  it("verification catches an owner who could see a claim", async () => {
    const c = await owner.connect()
    try {
      await loadSnapshot(c, snap())
      const { rows } = await c.query(`select pg_get_expr(polqual, polrelid) as q from pg_policy where polname = 'gift_claims_select'`)
      await c.query("drop policy gift_claims_select on gift_claims")
      await c.query("create policy gift_claims_select on gift_claims for select to app_user using (true)")
      try {
        expect((await verifySnapshot(c, app, snap())).join("\n")).toMatch(/owner .* sees/)
      } finally {
        // Put the real policy back so no other test runs against the weakened one.
        await c.query("drop policy gift_claims_select on gift_claims")
        await c.query(`create policy gift_claims_select on gift_claims for select to app_user using (${rows[0].q})`)
      }
    } finally { c.release() }
  })
})
