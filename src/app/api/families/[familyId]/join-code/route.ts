import { NextResponse } from "next/server"
import { serverError } from "@/lib/api"
import { requireUser } from "@/lib/auth/user"
import { resetJoinCode } from "@/lib/data/families"
import { withUser } from "@/lib/db/with-user"

type Params = { params: Promise<{ familyId: string }> }

// Reset the family's join link. The old code stops working; people already in stay in.
export async function POST(_: Request, { params }: Params) {
  const { familyId } = await params
  const user = await requireUser()
  if (user instanceof NextResponse) return user

  try {
    // RLS lets only the family's creator update it; anyone else gets null, so 404.
    const inviteCode = await withUser(user.id, (tx) => resetJoinCode(tx, familyId))
    if (!inviteCode) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ inviteCode })
  } catch (e) {
    return serverError("reset join code", e)
  }
}
