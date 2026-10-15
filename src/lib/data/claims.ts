import { desc, eq, sql } from "drizzle-orm"
import { giftClaims, gifts } from "@/db/schema"
import type { Tx } from "@/lib/db"
import type { GiftClaim } from "@/types"

export async function claimGift(tx: Tx, giftId: string, userId: string, status: "claimed" | "purchased"): Promise<GiftClaim> {
  const [row] = await tx.insert(giftClaims).values({ gift_id: giftId, claimed_by: userId, status }).returning()
  return row
}

export async function setClaimStatus(tx: Tx, giftId: string, status: "claimed" | "purchased"): Promise<GiftClaim | null> {
  const [row] = await tx.update(giftClaims).set({ status, updated_at: sql`now()` }).where(eq(giftClaims.gift_id, giftId)).returning()
  return row ?? null
}

export async function unclaimGift(tx: Tx, giftId: string): Promise<boolean> {
  return (await tx.delete(giftClaims).where(eq(giftClaims.gift_id, giftId)).returning({ id: giftClaims.id })).length > 0
}

export async function recentClaimsBy(tx: Tx, userId: string, limit: number) {
  const rows = await tx
    .select({ claim: giftClaims, gift: { id: gifts.id, title: gifts.title, price: gifts.price, owner_id: gifts.owner_id } })
    .from(giftClaims)
    .leftJoin(gifts, eq(gifts.id, giftClaims.gift_id))
    .where(eq(giftClaims.claimed_by, userId))
    .orderBy(desc(giftClaims.created_at))
    .limit(limit)
  return rows.map((r) => ({ ...r.claim, gifts: r.gift }))
}
