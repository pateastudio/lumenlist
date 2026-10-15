import { eq } from "drizzle-orm"
import { profiles } from "@/db/schema"
import type { Tx } from "@/lib/db"
import type { Profile } from "@/types"

export async function getProfile(tx: Tx, id: string): Promise<Profile | null> {
  const [row] = await tx.select().from(profiles).where(eq(profiles.id, id))
  return row ?? null
}
