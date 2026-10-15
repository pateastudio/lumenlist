import { NextResponse } from "next/server"
import { serverError } from "@/lib/api"
import { requireUser } from "@/lib/auth/user"
import { acceptInvite } from "@/lib/data/invites"
import { withUser } from "@/lib/db/with-user"

type Params = { params: Promise<{ token: string }> }

export async function POST(_: Request, { params }: Params) {
  const { token } = await params
  const user = await requireUser()
  if (user instanceof NextResponse) return user

  try {
    // accept_invite() checks the token is unexpired and unused, adds the membership, and marks it accepted.
    const familyId = await withUser(user.id, (tx) => acceptInvite(tx, token))
    if (!familyId) return NextResponse.json({ error: "Invite not found or expired" }, { status: 404 })
    return NextResponse.json({ familyId })
  } catch (e) {
    return serverError("accept invite", e)
  }
}
