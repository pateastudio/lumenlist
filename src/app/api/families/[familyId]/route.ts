import { NextResponse } from "next/server"
import { serverError } from "@/lib/api"
import { requireUser } from "@/lib/auth/user"
import { deleteFamily, getFamilyWithMembers, updateFamily } from "@/lib/data/families"
import { withUser } from "@/lib/db/with-user"
import { createFamilySchema } from "@/lib/validations"

type Params = { params: Promise<{ familyId: string }> }

export async function GET(_: Request, { params }: Params) {
  const { familyId } = await params
  const user = await requireUser()
  if (user instanceof NextResponse) return user

  const family = await withUser(user.id, (tx) => getFamilyWithMembers(tx, familyId))
  if (!family) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const userMember = family.family_members.find((m) => m.user_id === user.id)
  return NextResponse.json({ family, userRole: userMember?.role ?? "member" })
}

export async function PATCH(request: Request, { params }: Params) {
  const { familyId } = await params
  const user = await requireUser()
  if (user instanceof NextResponse) return user

  const parsed = createFamilySchema.partial().safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  if (!parsed.data.name) return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
  const name = parsed.data.name

  try {
    // RLS lets only the family's creator update it; anyone else gets null, so 404.
    const family = await withUser(user.id, (tx) => updateFamily(tx, familyId, { name }))
    if (!family) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ family })
  } catch (e) {
    return serverError("update family", e)
  }
}

export async function DELETE(_: Request, { params }: Params) {
  const { familyId } = await params
  const user = await requireUser()
  if (user instanceof NextResponse) return user

  try {
    const deleted = await withUser(user.id, (tx) => deleteFamily(tx, familyId))
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (e) {
    return serverError("delete family", e)
  }
}
