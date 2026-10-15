import { NextResponse } from "next/server"
import { serverError } from "@/lib/api"
import { requireUser } from "@/lib/auth/user"
import { createGift, listGiftsWithClaims, listOwnGifts } from "@/lib/data/gifts"
import { withUser } from "@/lib/db/with-user"
import { giftSchema } from "@/lib/validations"

export async function GET(request: Request) {
  const user = await requireUser()
  if (user instanceof NextResponse) return user
  const userId = new URL(request.url).searchParams.get("userId")

  try {
    // Someone else's list includes claims as RLS allows; your own never asks for them.
    const gifts = await withUser(user.id, (tx) =>
      userId && userId !== user.id ? listGiftsWithClaims(tx, userId) : listOwnGifts(tx, user.id),
    )
    return NextResponse.json({ gifts })
  } catch (e) {
    return serverError("list gifts", e)
  }
}

export async function POST(request: Request) {
  const user = await requireUser()
  if (user instanceof NextResponse) return user

  const parsed = giftSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const gift = await withUser(user.id, (tx) =>
      createGift(tx, user.id, {
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        price: parsed.data.price ? parseFloat(parsed.data.price) : null,
        url: parsed.data.url ?? null,
        image_url: parsed.data.image_url ?? null,
        source: "manual",
      }),
    )
    return NextResponse.json({ gift }, { status: 201 })
  } catch (e) {
    return serverError("create gift", e)
  }
}
