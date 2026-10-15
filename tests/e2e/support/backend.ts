// The only place the e2e suite touches the backend directly. Since Phase 2 it is Neon and Better
// Auth (neon-backend.ts); the specs did not change.
import { neonBackend } from "./neon-backend"
export { testEmail } from "./emails"

export interface TestUser {
  id: string
  email: string
  password: string
  name: string
}

export interface TourRow {
  walk_ended_at: Date | null
  walk_outcome: string | null
  steps_ended_at: Date | null
  steps_outcome: string | null
  peeked_at: Date | null
  secret_seen_at: Date | null
  hints_read: string[]
}

export interface TestBackend {
  /** The tour is marked over unless a spec asks for a fresh person (`{ tour: "fresh" }`). */
  createUser(label: string, options?: { tour?: "fresh" }): Promise<TestUser>
  deleteUser(user: TestUser): Promise<void>
  deleteUserByEmail(email: string): Promise<void>
  inviteToken(familyId: string, email: string): Promise<string>
  claimsVisibleTo(user: TestUser, giftId: string): Promise<number>
  /** The person's onboarding row as the database has it (read as the owner), or undefined when there is none. */
  tourRow(user: TestUser): Promise<TourRow | undefined>
}

export const backend: TestBackend = neonBackend
