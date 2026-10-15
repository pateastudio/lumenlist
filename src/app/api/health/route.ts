import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { schemaStatus } from "@/lib/health"

// Two levels, on purpose (adapted from wedding-platform):
//  - Anyone: liveness only. It never touches the database, so a stranger or a monitor can't wake
//    Neon's compute, and the Lambda bundle check can call it with no configuration.
//  - A caller with `Authorization: Bearer <HEALTH_TOKEN>` (smoke tests): is the database at the
//    schema this build expects? `behind` (a deploy without its migration) is 503. The answer
//    carries migration positions only, never connection details or error messages.
export const dynamic = "force-dynamic"

const noStore = { "Cache-Control": "no-store" }

function bearerMatches(header: string, token: string): boolean {
  const given = Buffer.from(header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "")
  const expected = Buffer.from(token)
  return given.length === expected.length && timingSafeEqual(given, expected)
}

export async function GET(request: Request) {
  const header = request.headers.get("authorization")
  if (!header) return NextResponse.json({ status: "ok" }, { headers: noStore })

  const token = process.env.HEALTH_TOKEN
  if (!token) return NextResponse.json({ status: "ok", deep: "disabled" }, { headers: noStore })
  if (!bearerMatches(header, token)) {
    return NextResponse.json({ status: "unauthorized" }, { status: 401, headers: noStore })
  }

  try {
    const schema = await schemaStatus()
    const ok = schema.state !== "behind"
    return NextResponse.json(
      { status: ok ? "ok" : "error", database: schema.state, schemaVersion: schema.applied, expectedSchemaVersion: schema.expected },
      { status: ok ? 200 : 503, headers: noStore },
    )
  } catch (error) {
    console.error("health: database check failed", error instanceof Error ? error.name : "unknown")
    return NextResponse.json({ status: "error", database: "unreachable" }, { status: 503, headers: noStore })
  }
}
