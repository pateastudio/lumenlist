import { sql } from "drizzle-orm"
import type { Tx } from "@/lib/db"

export async function createInvite(tx: Tx, familyId: string, email: string): Promise<string> {
  return (await tx.execute<{ t: string }>(sql`select create_invite(${familyId}, ${email}) as t`)).rows[0].t
}
export async function acceptInvite(tx: Tx, token: string): Promise<string | null> {
  return (await tx.execute<{ f: string | null }>(sql`select accept_invite(${token}) as f`)).rows[0].f
}
export async function joinFamily(tx: Tx, code: string): Promise<string | null> {
  return (await tx.execute<{ f: string | null }>(sql`select join_family(${code}) as f`)).rows[0].f
}
export async function invitePreview(tx: Tx, token: string) {
  const { rows } = await tx.execute<{ family_id: string; family_name: string; inviter_name: string }>(sql`select * from invite_preview(${token})`)
  return rows[0] ?? null
}
export async function joinPreview(tx: Tx, code: string) {
  const { rows } = await tx.execute<{ family_id: string; family_name: string }>(sql`select * from join_preview(${code})`)
  return rows[0] ?? null
}
