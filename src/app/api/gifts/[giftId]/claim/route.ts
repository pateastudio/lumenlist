import { NextResponse } from "next/server"
import { pgCode, serverError } from "@/lib/api"
import { requireUser } from "@/lib/auth/user"
import { claimGift, setClaimStatus, unclaimGift } from "@/lib/data/claims"
import { getGift } from "@/lib/data/gifts"
import { withUser } from "@/lib/db/with-user"

type Params = { params: Promise<{ giftId: string }> }

const statusFrom = (body: { status?: unknown }) => (body.status === "purchased" ? "purchased" : "claimed")

export async function POST(request: Request, { params }: Params) {
  const { giftId } = await params
  const user = await requireUser()
  if (user instanceof NextResponse) return user
  const status = statusFrom(await request.json().catch(() => ({})))

  try {
    const result = await withUser(user.id, async (tx) => {
      const gift = await getGift(tx, giftId)
      if (!gift) return { error: "Gift not found", code: 404 } as const
      // Also enforced by gift_claims_insert; checked here for a clear message.
      if (gift.owner_id === user.id) return { error: "You cannot claim your own gift", code: 403 } as const
      return { claim: await claimGift(tx, giftId, user.id, status) }
    })
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.code })
    return NextResponse.json({ claim: result.claim }, { status: 201 })
  } catch (e) {
    const code = pgCode(e)
    if (code === "23505") return NextResponse.json({ error: "Someone already claimed this gift" }, { status: 409 })
    if (code === "42501") return NextResponse.json({ error: "You can't claim this gift" }, { status: 403 })
    return serverError("claim gift", e)
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const { giftId } = await params
  const user = await requireUser()
  if (user instanceof NextResponse) return user
  const status = statusFrom(await request.json().catch(() => ({})))

  try {
    // RLS: only the claimer can change their claim.
    const claim = await withUser(user.id, (tx) => setClaimStatus(tx, giftId, status))
    if (!claim) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ claim })
  } catch (e) {
    return serverError("update claim", e)
  }
}

export async function DELETE(_: Request, { params }: Params) {
  const { giftId } = await params
  const user = await requireUser()
  if (user instanceof NextResponse) return user

  try {
    const removed = await withUser(user.id, (tx) => unclaimGift(tx, giftId))
    if (!removed) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (e) {
    return serverError("unclaim gift", e)
  }
}
