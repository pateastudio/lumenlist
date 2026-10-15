import { NextResponse } from "next/server"
import { serverError } from "@/lib/api"
import { requireUser } from "@/lib/auth/user"
import { createFamily } from "@/lib/data/families"
import { withUser } from "@/lib/db/with-user"
import { createFamilySchema } from "@/lib/validations"

export async function POST(request: Request) {
  const user = await requireUser()
  if (user instanceof NextResponse) return user

  const parsed = createFamilySchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const familyId = await withUser(user.id, (tx) => createFamily(tx, parsed.data.name))
    return NextResponse.json({ family: { id: familyId } }, { status: 201 })
  } catch (e) {
    return serverError("create family", e)
  }
}
