import { NextResponse } from "next/server"
import { serverError } from "@/lib/api"
import { requireUser } from "@/lib/auth/user"
import { joinFamily } from "@/lib/data/invites"
import { withUser } from "@/lib/db/with-user"
import { normalizeJoinCode } from "@/lib/join-code"
import { LIMITS, forbidden, hitLimits, requestIp, tooManyRequests } from "@/lib/rate-limit"

type Params = { params: Promise<{ inviteCode: string }> }

export async function POST(request: Request, { params }: Params) {
  const inviteCode = normalizeJoinCode((await params).inviteCode)
  if (!inviteCode) {
    return NextResponse.json({ error: "Invalid invite link" }, { status: 404 })
  }
  const ip = requestIp(request.headers)
  if (!ip) return forbidden()
  const user = await requireUser()
  if (user instanceof NextResponse) return user

  try {
    // join_family() finds the family by code and adds the caller, idempotently. A wrong code
    // still counts against the limit, which is what slows down guessing.
    const result = await withUser(user.id, async (tx): Promise<{ wait: number } | { familyId: string | null }> => {
      const wait = await hitLimits(tx, LIMITS.join(ip, user.id))
      if (wait) return { wait }
      return { familyId: await joinFamily(tx, inviteCode) }
    })
    if ("wait" in result) return tooManyRequests(result.wait)
    if (!result.familyId) return NextResponse.json({ error: "Invalid invite link" }, { status: 404 })
    return NextResponse.json({ familyId: result.familyId })
  } catch (e) {
    return serverError("join family", e)
  }
}
