import "server-only"
import { cache } from "react"
import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/server"

export type CurrentUser = { id: string; email: string; name: string }

// One session read per request, shared by the (app) layout and the page. With the cookie cache
// this normally reads a signed cookie, not the database.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const s = await auth.api.getSession({ headers: await headers() })
  return s ? { id: s.user.id, email: s.user.email, name: s.user.name } : null
})

export async function requireUser(): Promise<CurrentUser | NextResponse> {
  return (await getCurrentUser()) ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
