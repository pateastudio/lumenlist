import { NextResponse } from "next/server"
import { serverError } from "@/lib/api"
import { requireUser } from "@/lib/auth/user"
import { listFamilyMembers, removeMember } from "@/lib/data/families"
import { withUser } from "@/lib/db/with-user"

type Params = { params: Promise<{ familyId: string }> }

export async function GET(_: Request, { params }: Params) {
  const { familyId } = await params
  const user = await requireUser()
  if (user instanceof NextResponse) return user

  try {
    const members = await withUser(user.id, (tx) => listFamilyMembers(tx, familyId))
    return NextResponse.json({ members })
  } catch (e) {
    return serverError("list members", e)
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const { familyId } = await params
  const user = await requireUser()
  if (user instanceof NextResponse) return user

  const userId = new URL(request.url).searchParams.get("userId")
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })

  try {
    // RLS: you can remove yourself, or anyone if you created the family.
    const removed = await withUser(user.id, (tx) => removeMember(tx, familyId, userId))
    if (!removed) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (e) {
    return serverError("remove member", e)
  }
}
