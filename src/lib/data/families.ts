import { and, asc, count, eq, inArray, ne, sql } from "drizzle-orm"
import { families, familyMembers, profiles } from "@/db/schema"
import type { Tx } from "@/lib/db"
import type { Family, FamilyMemberWithProfile, FamilyWithMembers } from "@/types"

export async function listMyFamilies(tx: Tx, userId: string): Promise<(Family & { member_count: number })[]> {
  const mine = tx.select({ id: familyMembers.family_id }).from(familyMembers).where(eq(familyMembers.user_id, userId))
  const rows = await tx
    .select({ family: families, member_count: count(familyMembers.id) })
    .from(families)
    .leftJoin(familyMembers, eq(familyMembers.family_id, families.id))
    .where(inArray(families.id, mine))
    .groupBy(families.id)
    .orderBy(asc(families.created_at))
  return rows.map((r) => ({ ...r.family, member_count: Number(r.member_count) }))
}

export async function getFamily(tx: Tx, familyId: string): Promise<Family | null> {
  const [row] = await tx.select().from(families).where(eq(families.id, familyId))
  return row ?? null
}

export async function listFamilyMembers(tx: Tx, familyId: string): Promise<FamilyMemberWithProfile[]> {
  const rows = await tx
    .select({ member: familyMembers, profile: profiles })
    .from(familyMembers)
    .innerJoin(profiles, eq(profiles.id, familyMembers.user_id))
    .where(eq(familyMembers.family_id, familyId))
    .orderBy(asc(familyMembers.joined_at))
  return rows.map((r) => ({ ...r.member, profiles: r.profile }))
}

export async function getFamilyWithMembers(tx: Tx, familyId: string): Promise<FamilyWithMembers | null> {
  const family = await getFamily(tx, familyId)
  if (!family) return null
  return { ...family, family_members: await listFamilyMembers(tx, familyId) }
}

export async function isMember(tx: Tx, familyId: string, userId: string): Promise<boolean> {
  const [row] = await tx.select({ id: familyMembers.id }).from(familyMembers)
    .where(and(eq(familyMembers.family_id, familyId), eq(familyMembers.user_id, userId)))
  return Boolean(row)
}

export async function createFamily(tx: Tx, name: string): Promise<string> {
  const { rows } = await tx.execute<{ id: string }>(sql`select create_family(${name}) as id`)
  return rows[0].id
}

export async function updateFamily(tx: Tx, familyId: string, patch: { name: string }): Promise<Family | null> {
  const [row] = await tx.update(families).set({ name: patch.name, updated_at: sql`now()` })
    .where(eq(families.id, familyId)).returning()
  return row ?? null
}

// A new join link: the code goes back to the column's default (32 random hex characters), and the
// old one stops working at once. RLS (families_update_owner) lets only the owner; anyone else gets null.
export async function resetJoinCode(tx: Tx, familyId: string): Promise<string | null> {
  const [row] = await tx.update(families).set({ invite_code: sql`default`, updated_at: sql`now()` })
    .where(eq(families.id, familyId)).returning({ invite_code: families.invite_code })
  return row?.invite_code ?? null
}

export async function deleteFamily(tx: Tx, familyId: string): Promise<boolean> {
  return (await tx.delete(families).where(eq(families.id, familyId)).returning({ id: families.id })).length > 0
}

export async function removeMember(tx: Tx, familyId: string, userId: string): Promise<boolean> {
  return (await tx.delete(familyMembers)
    .where(and(eq(familyMembers.family_id, familyId), eq(familyMembers.user_id, userId)))
    .returning({ id: familyMembers.id })).length > 0
}

export async function fellowMembers(tx: Tx, userId: string, limit: number) {
  const mine = tx.select({ id: familyMembers.family_id }).from(familyMembers).where(eq(familyMembers.user_id, userId))
  const rows = await tx
    .select({ user_id: familyMembers.user_id, family_id: familyMembers.family_id, familyName: families.name, profileName: profiles.name })
    .from(familyMembers)
    .innerJoin(families, eq(families.id, familyMembers.family_id))
    .innerJoin(profiles, eq(profiles.id, familyMembers.user_id))
    .where(and(inArray(familyMembers.family_id, mine), ne(familyMembers.user_id, userId)))
    .limit(limit)
  return rows.map((r) => ({ user_id: r.user_id, family_id: r.family_id, families: { name: r.familyName }, profiles: { name: r.profileName } }))
}
