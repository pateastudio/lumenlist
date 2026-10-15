import { NextResponse } from "next/server"
import { serverError } from "@/lib/api"
import { requireUser } from "@/lib/auth/user"
import { recordTourEvent } from "@/lib/data/onboarding"
import { withUser } from "@/lib/db/with-user"
import { tourEventSchema } from "@/lib/validations"

// One event per request (see tourEventSchema). The database sets the times, and every event is
// safe to repeat, so the client may send and forget.
export async function PATCH(request: Request) {
  const user = await requireUser()
  if (user instanceof NextResponse) return user
  const parsed = tourEventSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Unknown tour event" }, { status: 400 })

  try {
    await withUser(user.id, (tx) => recordTourEvent(tx, user.id, parsed.data))
    return NextResponse.json({ ok: true })
  } catch (e) {
    return serverError("record tour event", e)
  }
}
