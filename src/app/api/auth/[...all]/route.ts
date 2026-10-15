import { toNextJsHandler } from "better-auth/next-js"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/server"
import { CLIENT_IP_HEADER, clientIp } from "@/lib/client-ip"

const handler = toNextJsHandler(auth)

// Better Auth rate-limits by client IP. Every request reaches it with a trustworthy IP on our own
// header, or is refused here: never in a bucket shared by every user (src/lib/client-ip.ts).
function withClientIp(next: (request: Request) => Promise<Response>) {
  return async (request: Request) => {
    const resolved = clientIp(request.headers, process.env.ORIGIN_VERIFY_SECRET)
    if ("reject" in resolved) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    const headers = new Headers(request.headers)
    headers.set(CLIENT_IP_HEADER, resolved.ip)
    // Rebuilt from its parts: under OpenNext the incoming request isn't this runtime's own
    // Request, and `new Request(request, init)` can't clone it. Auth bodies are small.
    const hasBody = request.method !== "GET" && request.method !== "HEAD"
    return next(
      new Request(request.url, {
        method: request.method,
        headers,
        body: hasBody ? await request.arrayBuffer() : undefined,
      }),
    )
  }
}

export const GET = withClientIp(handler.GET)
export const POST = withClientIp(handler.POST)
