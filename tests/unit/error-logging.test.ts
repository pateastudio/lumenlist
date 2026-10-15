import { inspect } from "node:util"
import { afterEach, describe, expect, it, vi } from "vitest"
import { DrizzleQueryError, sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import { pgCode, serverError } from "@/lib/api"
import { describeError } from "@/lib/log"
import "@/lib/db" // installs the scrub on Drizzle's prepared queries

// The privacy policy says a log entry can include an email address and nothing else a person put
// into Lumen. A failed query must not write its parameters (gift, family and claim data) to the logs.
const secrets = ["Lego Millennium Falcon", "wrap it in blue", "The Smith Family", "aunt@example.com", "a-session-token"]
const params = secrets
const query = 'insert into "gifts" ("title", "description", "family", "email", "token") values ($1, $2, $3, $4, $5)'

// What node-postgres throws: a DatabaseError whose detail repeats the row's values.
function pgError(code: string, message: string) {
  return Object.assign(new Error(message), {
    name: "error",
    severity: "ERROR",
    code,
    constraint: "gifts_title_key",
    table: "gifts",
    detail: `Key (title)=(${secrets[0]}) already exists. Failing row contains (${secrets.join(", ")}).`,
    where: `SQL statement "insert into gifts values ('${secrets[3]}')"`,
  })
}

function logged(spy: { mock: { calls: unknown[][] } }): string {
  return spy.mock.calls.map((args) => args.map((a: unknown) => (typeof a === "string" ? a : inspect(a, { depth: 10 }))).join(" ")).join("\n")
}

function expectNoSecrets(text: string) {
  for (const s of secrets) expect(text).not.toContain(s)
}

afterEach(() => vi.restoreAllMocks())

describe("error logging", () => {
  it("serverError logs a DrizzleQueryError without its query or params", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    const error = new DrizzleQueryError(query, params, pgError("23505", 'duplicate key value violates unique constraint "gifts_title_key"'))
    const res = serverError("create gift", error)

    expect(res.status).toBe(500)
    const text = logged(log)
    expectNoSecrets(text)
    expect(text).not.toContain("insert into")
    // Still useful: what failed, the pg code and the constraint.
    expect(text).toContain("[api] create gift")
    expect(text).toContain("DrizzleQueryError")
    expect(text).toContain("code=23505")
    expect(text).toContain("constraint=gifts_title_key")
  })

  it("leaves out pg messages that repeat a value (class 22)", () => {
    const error = new DrizzleQueryError(query, params, pgError("22P02", `invalid input syntax for type uuid: "${secrets[0]}"`))
    const line = describeError(error)
    expectNoSecrets(line)
    expect(line).toContain("code=22P02")
  })

  it("leaves out a JSON SyntaxError's message, which quotes the input", () => {
    let error: unknown
    try {
      JSON.parse(`{"title": "${secrets[0]}"`)
    } catch (e) {
      error = e
    }
    expectNoSecrets(describeError(error))
  })

  it("keeps the message of an ordinary error", () => {
    expect(describeError(new TypeError("x is not a function"))).toBe("TypeError: x is not a function")
  })

  it("scrubs the error where Drizzle makes it, so any log that prints it is safe", async () => {
    const client = { query: vi.fn().mockRejectedValue(pgError("23505", 'duplicate key value violates unique constraint "gifts_title_key"')) }
    const db = drizzle({ client: client as never })
    const error = await db.execute(sql`insert into gifts (title, email) values (${secrets[0]}, ${secrets[3]})`).catch((e: unknown) => e)

    expect(client.query).toHaveBeenCalled() // the query really ran through Drizzle
    expect(error).toBeInstanceOf(DrizzleQueryError)
    // What Next.js or Better Auth would print for an uncaught error.
    const printed = `${inspect(error, { depth: 10 })}\n${String((error as Error).stack)}\n${(error as Error).message}`
    expectNoSecrets(printed)
    expect(printed).not.toContain("insert into")
    // The routes still map Postgres codes to statuses.
    expect(pgCode(error)).toBe("23505")
  })
})
