// /members/[userId] against the real database: the page shows someone's list only when you share a
// family with them (#160). The session and Next's navigation helpers are stand-ins; the profile and
// gift reads go through the real withUser and RLS.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import MemberWishlistPage from "@/app/(app)/members/[userId]/page"
import { makeUser, owner, reset } from "./helpers"

const session = vi.hoisted(() => ({ user: null as { id: string; email: string; name: string } | null }))

vi.mock("@/lib/auth/user", () => ({ getCurrentUser: async () => session.user }))
vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("NEXT_NOT_FOUND") },
  redirect: (to: string) => { throw new Error(`NEXT_REDIRECT ${to}`) },
}))

let alice: string, bob: string, dave: string, family: string

beforeAll(async () => {
  await reset()
  alice = await makeUser("alice"); bob = await makeUser("bob"); dave = await makeUser("dave")
  family = (await owner.query("insert into families (name, created_by) values ('Fam', $1) returning id", [alice])).rows[0].id
  await owner.query("insert into family_members (family_id, user_id) values ($1, $2)", [family, bob])
})
afterAll(async () => { await reset(); await owner.end() })
beforeEach(() => { session.user = null })

const visit = (viewer: string, userId: string) => {
  session.user = { id: viewer, email: `${viewer}@test.invalid`, name: "viewer" }
  return MemberWishlistPage({ params: Promise.resolve({ userId }), searchParams: Promise.resolve({}) })
}

describe("/members/[userId]", () => {
  it("shows a family member's list", async () => {
    await expect(visit(bob, alice)).resolves.toBeTruthy()
  })
  it("is not found for someone you share no family with", async () => {
    await expect(visit(dave, alice)).rejects.toThrow("NEXT_NOT_FOUND")
    await expect(visit(alice, dave)).rejects.toThrow("NEXT_NOT_FOUND")
  })
  it("is not found once the person leaves your family", async () => {
    await owner.query("delete from family_members where family_id = $1 and user_id = $2", [family, bob])
    await expect(visit(alice, bob)).rejects.toThrow("NEXT_NOT_FOUND")
  })
  it("sends you to your own list, and a signed-out visitor to sign in", async () => {
    await expect(visit(alice, alice)).rejects.toThrow("NEXT_REDIRECT /gifts")
    session.user = null
    await expect(MemberWishlistPage({ params: Promise.resolve({ userId: alice }), searchParams: Promise.resolve({}) }))
      .rejects.toThrow("NEXT_REDIRECT /login")
  })
})
