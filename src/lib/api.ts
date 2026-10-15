import { NextResponse } from "next/server"
import { describeError } from "@/lib/log"

// API routes answer with generic messages. The logs get the error's name, Postgres code and
// constraint (describeError), never the query, its parameters or anything else from the request.
export function serverError(context: string, error: unknown): NextResponse {
  console.error(`[api] ${context}:`, describeError(error))
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
}

// Postgres error codes the routes map to HTTP statuses.
export function pgCode(error: unknown): string | undefined {
  const e = error as { code?: string; cause?: { code?: string } }
  return e?.code ?? e?.cause?.code
}
