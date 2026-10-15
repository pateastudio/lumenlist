import { describe, expect, it } from "vitest"
import bcrypt from "bcryptjs"
import { mapAuthUsers } from "../../scripts/import/map"

const u = (o: Record<string, string | null>) => ({
  id: "u1", email: "a@example.com", encrypted_password: "$2a$10$abcdefghijklmnopqrstuuJ7gK8a9x1yQe1xQ5y8m6Gq2wq8zq7u",
  email_confirmed_at: "2026-01-01 00:00:00+00", raw_user_meta_data: '{"name": "Ann"}',
  created_at: "2026-01-01 00:00:00+00", updated_at: "2026-01-02 00:00:00+00", ...o,
})

describe("mapAuthUsers", () => {
  it("keeps the id, email, hash and timestamps, and reads the name from metadata", () => {
    const { users, accounts, problems } = mapAuthUsers([u({})], [])
    expect(problems).toEqual([])
    expect(users[0]).toEqual({ id: "u1", name: "Ann", email: "a@example.com", email_verified: true,
      created_at: "2026-01-01 00:00:00+00", updated_at: "2026-01-02 00:00:00+00" })
    expect(accounts[0]).toEqual({ account_id: "u1", provider_id: "credential", user_id: "u1",
      password: u({}).encrypted_password, created_at: "2026-01-01 00:00:00+00", updated_at: "2026-01-02 00:00:00+00" })
  })
  it("keeps an unconfirmed user unconfirmed", () => {
    expect(mapAuthUsers([u({ email_confirmed_at: null })], []).users[0].email_verified).toBe(false)
  })
  it("falls back to the profile's name, then the email", () => {
    expect(mapAuthUsers([u({ raw_user_meta_data: "{}" })], [{ id: "u1", name: "Profile Ann" }]).users[0].name).toBe("Profile Ann")
    expect(mapAuthUsers([u({ raw_user_meta_data: null })], []).users[0].name).toBe("a@example.com")
  })
  it("reports a user without a usable bcrypt hash instead of importing it silently", () => {
    expect(mapAuthUsers([u({ encrypted_password: null })], []).problems[0]).toMatch(/u1/)
  })
  it("produces hashes Better Auth's bcrypt verify accepts", async () => {
    const hash = await bcrypt.hash("Real-Password-1", 10)
    const { accounts } = mapAuthUsers([u({ encrypted_password: hash.replace(/^\$2b\$/, "$2a$") })], [])
    expect(await bcrypt.compare("Real-Password-1", accounts[0].password)).toBe(true)
  })
})
