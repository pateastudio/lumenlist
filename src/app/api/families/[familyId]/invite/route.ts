import { NextResponse } from "next/server"
import { pgCode, serverError } from "@/lib/api"
import { requireUser } from "@/lib/auth/user"
import { getFamily } from "@/lib/data/families"
import { createInvite } from "@/lib/data/invites"
import { getProfile } from "@/lib/data/profiles"
import { withUser } from "@/lib/db/with-user"
import { LIMITS, forbidden, hitLimits, requestIp, tooManyRequests } from "@/lib/rate-limit"
import { sendInviteEmail } from "@/lib/resend"
import { inviteMemberSchema } from "@/lib/validations"

type Params = { params: Promise<{ familyId: string }> }

export async function POST(request: Request, { params }: Params) {
  const { familyId } = await params
  const ip = requestIp(request.headers)
  if (!ip) return forbidden()
  const user = await requireUser()
  if (user instanceof NextResponse) return user

  const parsed = inviteMemberSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  let result: { wait: number } | { token: string; familyName: string; inviterName: string }
  try {
    // create_invite() checks membership and replaces any earlier invite for this address. If it
    // refuses, the transaction rolls back and the attempt doesn't count against the limits.
    result = await withUser(user.id, async (tx) => {
      const wait = await hitLimits(tx, LIMITS.invite(ip, user.id, familyId))
      if (wait) return { wait }
      const token = await createInvite(tx, familyId, parsed.data.email)
      const [family, profile] = await Promise.all([getFamily(tx, familyId), getProfile(tx, user.id)])
      return { token, familyName: family?.name ?? "your family", inviterName: profile?.name || "A family member" }
    })
  } catch (e) {
    if (pgCode(e) === "P0001" || /Forbidden/.test(String(e))) {
      return NextResponse.json({ error: "Not a member" }, { status: 403 })
    }
    return serverError("create invite", e)
  }
  if ("wait" in result) return tooManyRequests(result.wait)

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "")
  await sendInviteEmail({
    to: parsed.data.email,
    inviterName: result.inviterName,
    familyName: result.familyName,
    inviteUrl: `${appUrl}/invite/${result.token}`,
  })

  return NextResponse.json({ success: true })
}
