import "server-only"
import { sql } from "drizzle-orm"
import { appDb, type Tx } from "./index"

// Every query against user data runs here: one transaction, as app_user, with app.user_id set
// for this transaction only (set_config's third argument). RLS reads it through auth.uid().
export function withUser<T>(userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return appDb.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`)
    return fn(tx)
  })
}

// For the signed-out landing pages: no user set, so RLS hides every row; only the preview
// functions return anything.
export function withAnonymous<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return appDb.transaction((tx) => fn(tx))
}
