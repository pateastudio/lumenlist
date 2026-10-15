import { NextResponse } from "next/server"
import { serverError } from "@/lib/api"
import { requireUser } from "@/lib/auth/user"
import { deleteGift, getGift, updateGift } from "@/lib/data/gifts"
import { withUser } from "@/lib/db/with-user"
import { giftSchema } from "@/lib/validations"
import type { NewGift } from "@/types"

type Params = { params: Promise<{ giftId: string }> }

export async function GET(_: Request, { params }: Params) {
  const { giftId } = await params
  const user = await requireUser()
  if (user instanceof NextResponse) return user

  // RLS: visible to the owner and to anyone sharing a family with them; 404 for everyone else.
  const gift = await withUser(user.id, (tx) => getGift(tx, giftId))
  if (!gift) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ gift })
}

export async function PATCH(request: Request, { params }: Params) {
  const { giftId } = await params
  const user = await requireUser()
  if (user instanceof NextResponse) return user

  const parsed = giftSchema.partial().safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const { price, ...rest } = parsed.data
  const patch: Partial<NewGift> = { ...rest }
  if (price !== undefined) patch.price = price ? parseFloat(price) : null

  try {
    // RLS lets only the owner update; anyone else gets null, so 404.
    const gift = await withUser(user.id, (tx) => updateGift(tx, giftId, patch))
    if (!gift) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ gift })
  } catch (e) {
    return serverError("update gift", e)
  }
}

export async function DELETE(_: Request, { params }: Params) {
  const { giftId } = await params
  const user = await requireUser()
  if (user instanceof NextResponse) return user

  try {
    const deleted = await withUser(user.id, (tx) => deleteGift(tx, giftId))
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (e) {
    return serverError("delete gift", e)
  }
}
