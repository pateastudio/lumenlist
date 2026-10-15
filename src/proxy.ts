import { NextResponse, type NextRequest } from "next/server"
import { getSessionCookie } from "better-auth/cookies"
import { auth } from "@/lib/auth/server"
import { describeError } from "@/lib/log"

const protectedPaths = ["/dashboard", "/account", "/gifts", "/families", "/members", "/api/families", "/api/gifts", "/api/join", "/api/onboarding"]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  // "/" is the public marketing page, and it is static. Someone who is signed in goes to Home
  // instead. With no session cookie there is nothing to check, so a visitor costs no session read.
  if (pathname === "/") {
    if (!getSessionCookie(request)) return NextResponse.next()
    try {
      const session = await auth.api.getSession({ headers: request.headers })
      if (session) {
        // "/" is built static and sent with a long s-maxage, but this answer depends on who asks.
        // Marking the redirect private keeps a shared cache from handing it to a visitor.
        const res = NextResponse.redirect(new URL("/dashboard", request.url))
        res.headers.set("Cache-Control", "private, no-store")
        return res
      }
    } catch (e) {
      // A failed check must not take the front page down with it.
      console.error("[proxy] session check at / failed:", describeError(e))
    }
    return NextResponse.next()
  }
  if (!protectedPaths.some((p) => pathname.startsWith(p))) return NextResponse.next()
  // Server Components can't set cookies, so this is where the session cookie cache is refreshed.
  const { headers: setHeaders, response: session } = await auth.api.getSession({ headers: request.headers, returnHeaders: true })
  if (!session) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }
  const res = NextResponse.next()
  setHeaders?.forEach((value, key) => { if (key.toLowerCase() === "set-cookie") res.headers.append(key, value) })
  return res
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/health|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
