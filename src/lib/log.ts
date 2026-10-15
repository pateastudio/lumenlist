import { DrizzleQueryError } from "drizzle-orm"

// Server logs go to CloudWatch and are kept 30 days. The privacy policy says a log entry can
// include an email address, and nothing else a person put into Lumen. So errors are logged by
// their shape (name, Postgres code, constraint, table, column), never by the values involved.

type ErrorFields = {
  name?: unknown
  message?: unknown
  code?: unknown
  constraint?: unknown
  table?: unknown
  column?: unknown
  severity?: unknown
  detail?: unknown
  hint?: unknown
  where?: unknown
  internalQuery?: unknown
  position?: unknown
  internalPosition?: unknown
  query?: unknown
  params?: unknown
  stack?: unknown
  cause?: unknown
}

const WITHHELD = "(not logged)"

// node-postgres puts these on a DatabaseError. They carry schema names only.
function isPgError(e: ErrorFields): boolean {
  return typeof e.severity === "string" && typeof e.code === "string"
}

// Postgres data exceptions (class 22) repeat the bad value: invalid input syntax for type uuid: "…".
function pgMessageIsSafe(code: string): boolean {
  return !code.startsWith("22")
}

function messageIsSafe(error: unknown): boolean {
  if (error instanceof DrizzleQueryError) return false // "Failed query: <sql> params: <values>"
  if (error instanceof SyntaxError) return false // JSON.parse repeats the input it choked on
  const e = error as ErrorFields
  if (isPgError(e)) return pgMessageIsSafe(e.code as string)
  return true
}

function nameOf(error: unknown): string {
  if (error instanceof DrizzleQueryError) return "DrizzleQueryError"
  const name = (error as ErrorFields)?.name
  return typeof name === "string" && name ? name : typeof error
}

// One line, safe to log. Walks the cause chain (a DrizzleQueryError's cause is the pg error).
export function describeError(error: unknown): string {
  const parts: string[] = []
  let current: unknown = error
  for (let depth = 0; depth < 4 && current != null; depth++) {
    if (typeof current !== "object") {
      parts.push(typeof current)
      break
    }
    const e = current as ErrorFields
    let part = nameOf(current)
    for (const key of ["code", "constraint", "table", "column"] as const) {
      if (typeof e[key] === "string" && e[key]) part += ` ${key}=${e[key]}`
    }
    if (messageIsSafe(current) && typeof e.message === "string" && e.message) part += `: ${e.message}`
    parts.push(part)
    current = e.cause
  }
  return parts.join(" <- ")
}

function stackFrames(stack: unknown): string {
  if (typeof stack !== "string") return ""
  return stack
    .split("\n")
    .filter((line) => /^\s+at /.test(line))
    .join("\n")
}

function rewrite(e: ErrorFields, name: string, message: string) {
  const frames = stackFrames(e.stack)
  e.name = name
  e.message = message
  e.stack = frames ? `${name}: ${message}\n${frames}` : `${name}: ${message}`
}

// Drizzle puts the SQL and every parameter into the message of the error it throws, and keeps
// both as properties. Anything that prints the error (our logs, Next.js, Better Auth) would write
// gift, family and claim data, or a session token, to the logs. This strips them in place, so the
// error keeps its type, its stack frames and the pg error's code and constraint for pgCode().
export function scrubQueryError(error: unknown): unknown {
  if (!(error instanceof DrizzleQueryError)) return error
  const e = error as ErrorFields
  delete e.query
  delete e.params
  rewrite(e, "DrizzleQueryError", `Failed query ${WITHHELD}`)
  const cause = e.cause as ErrorFields | undefined
  if (cause && typeof cause === "object" && isPgError(cause)) {
    // detail: "Key (email)=(…) already exists"; where and internalQuery: SQL with values.
    for (const key of ["detail", "hint", "where", "internalQuery", "position", "internalPosition"] as const) {
      delete cause[key]
    }
    if (!pgMessageIsSafe(cause.code as string)) {
      rewrite(cause, typeof cause.name === "string" ? cause.name : "error", `${cause.code} ${WITHHELD}`)
    }
  }
  return error
}
