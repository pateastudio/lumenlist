import type { families, familyInvites, familyMembers, giftClaims, gifts, onboarding, profiles } from "@/db/schema"

export type Profile = typeof profiles.$inferSelect
export type Family = typeof families.$inferSelect
export type FamilyMember = typeof familyMembers.$inferSelect
export type FamilyInvite = typeof familyInvites.$inferSelect
export type Gift = typeof gifts.$inferSelect
export type NewGift = Omit<typeof gifts.$inferInsert, "id" | "owner_id" | "created_at" | "updated_at">
export type GiftClaim = typeof giftClaims.$inferSelect
export type Onboarding = typeof onboarding.$inferSelect

export type FamilyMemberWithProfile = FamilyMember & { profiles: Profile }
export type GiftWithClaim = Gift & { gift_claims: GiftClaim | null }
export type FamilyWithMembers = Family & { family_members: FamilyMemberWithProfile[] }
