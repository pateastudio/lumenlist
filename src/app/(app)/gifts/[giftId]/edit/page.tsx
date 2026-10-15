import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { GiftForm } from "@/components/gifts/gift-form"
import { BackLink } from "@/components/shared/back-link"
import { PageHeader } from "@/components/shared/page-header"
import { getCurrentUser } from "@/lib/auth/user"
import { withUser } from "@/lib/db/with-user"
import { getGift } from "@/lib/data/gifts"

type Params = { params: Promise<{ giftId: string }> }

export const metadata: Metadata = { title: "Edit gift" }

export default async function EditGiftPage({ params }: Params) {
  const { giftId } = await params
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const gift = await withUser(user.id, (tx) => getGift(tx, giftId))
  if (!gift || gift.owner_id !== user.id) notFound()

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <BackLink href="/gifts">My list</BackLink>
        <PageHeader title="Edit gift" className="mt-1" />
      </div>
      <GiftForm gift={gift} />
    </div>
  )
}
