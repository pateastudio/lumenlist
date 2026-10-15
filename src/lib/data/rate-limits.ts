import { sql } from "drizzle-orm"
import type { Tx } from "@/lib/db"

// Counts one hit on a key (take_rate_limit(), drizzle/0006). Runs as a definer function, so it
// works inside withAnonymous() too.
export async function takeRateLimit(tx: Tx, key: string, limit: number, windowSeconds: number) {
  const { rows } = await tx.execute<{ allowed: boolean; retry_after: number }>(
    sql`select * from take_rate_limit(${key}, ${limit}, ${windowSeconds})`,
  )
  return { allowed: rows[0].allowed, retryAfter: rows[0].retry_after }
}
