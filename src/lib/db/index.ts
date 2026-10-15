import "server-only"
import { drizzle } from "drizzle-orm/node-postgres"
import { PgPreparedQuery } from "drizzle-orm/pg-core"
import pg from "pg"
import * as schema from "@/db/schema"
import { describeError, scrubQueryError } from "@/lib/log"

// Every Drizzle query runs through queryWithCache, which wraps a failure in a DrizzleQueryError
// whose message holds the SQL and its parameters. Scrubbing it here, where it's made, keeps gift,
// family and claim data (and Better Auth's session tokens) out of every log that prints it,
// including Next.js's and Better Auth's own. tests/unit/error-logging.test.ts runs a real
// query through it, so a Drizzle upgrade that renames the method fails that test.
const prepared = PgPreparedQuery.prototype as unknown as {
  queryWithCache: (this: unknown, ...args: unknown[]) => Promise<unknown>
  scrubbed?: true
}
if (typeof prepared.queryWithCache !== "function") throw new Error("drizzle: queryWithCache not found; see src/lib/db/index.ts")
if (!prepared.scrubbed) {
  const queryWithCache = prepared.queryWithCache
  prepared.queryWithCache = async function (...args) {
    try {
      return await queryWithCache.apply(this, args)
    } catch (error) {
      throw scrubQueryError(error)
    }
  }
  prepared.scrubbed = true
}

// One small pool per Lambda container per role. Neon's pooler fans these out. Lambda runs one
// request per container at a time, so 2 connections is plenty. Idle connections are closed after
// a minute, so a container thawed after a long freeze reconnects instead of reusing a dead socket.
function pool(connectionString: string | undefined, name: string): pg.Pool {
  const p = new pg.Pool({ connectionString, max: 2, idleTimeoutMillis: 60_000 })
  // pg-pool re-emits an idle client's socket error here (Neon scaling to zero, a pooler restart).
  // Without a listener that's an uncaught exception that takes the Lambda down. The pool drops the
  // broken client and the next query gets a fresh one, so logging is enough.
  p.on("error", (error) => console.error(`[db] idle ${name} connection error:`, describeError(error)))
  return p
}

export const appPool = pool(process.env.DATABASE_URL, "app_user")
export const authPool = pool(process.env.AUTH_DATABASE_URL, "auth_service")

export const appDb = drizzle(appPool, { schema })
export const authDb = drizzle(authPool, { schema })
export type Tx = Parameters<Parameters<typeof appDb.transaction>[0]>[0]
