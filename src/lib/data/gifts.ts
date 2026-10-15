import { asc, eq, getTableColumns, sql } from "drizzle-orm"
import { giftClaims, gifts } from "@/db/schema"
import type { Tx } from "@/lib/db"
import type { Gift, GiftWithClaim, NewGift } from "@/types"

// Never joins claims: the owner's own list must not even ask.
export async function listOwnGifts(tx: Tx, ownerId: string): Promise<Gift[]> {
  return tx.select().from(gifts).where(eq(gifts.owner_id, ownerId)).orderBy(asc(gifts.sort_order))
}

// Claims as RLS allows: an owner gets null for every claim; family members see them.
export async function listGiftsWithClaims(tx: Tx, ownerId: string): Promise<GiftWithClaim[]> {
  const rows = await tx
    .select({ gift: getTableColumns(gifts), claim: giftClaims })
    .from(gifts)
    .leftJoin(giftClaims, eq(giftClaims.gift_id, gifts.id))
    .where(eq(gifts.owner_id, ownerId))
    .orderBy(asc(gifts.sort_order))
  return rows.map((r) => ({ ...r.gift, gift_claims: r.claim }))
}

export async function getGift(tx: Tx, giftId: string): Promise<Gift | null> {
  const [row] = await tx.select().from(gifts).where(eq(gifts.id, giftId))
  return row ?? null
}

export async function createGift(tx: Tx, ownerId: string, input: NewGift): Promise<Gift> {
  const [row] = await tx.insert(gifts).values({ ...input, owner_id: ownerId }).returning()
  return row
}

export async function updateGift(tx: Tx, giftId: string, patch: Partial<NewGift>): Promise<Gift | null> {
  const [row] = await tx.update(gifts).set({ ...patch, updated_at: sql`now()` }).where(eq(gifts.id, giftId)).returning()
  return row ?? null
}

export async function deleteGift(tx: Tx, giftId: string): Promise<boolean> {
  return (await tx.delete(gifts).where(eq(gifts.id, giftId)).returning({ id: gifts.id })).length > 0
}
