import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { AddGiftButton, MyListHeader } from "@/components/gifts/my-list-header"
import { OwnGiftCard } from "@/components/gifts/own-gift-card"
import { EmptyState } from "@/components/shared/empty-state"
import { getCurrentUser } from "@/lib/auth/user"
import { withUser } from "@/lib/db/with-user"
import { listOwnGifts } from "@/lib/data/gifts"

export const metadata: Metadata = { title: "My list" }

export default async function MyGiftsPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const giftList = await withUser(user.id, (tx) => listOwnGifts(tx, user.id))

  return (
    <div className="flex flex-col gap-5">
      <MyListHeader count={giftList.length} />

      {giftList.length === 0 ? (
        <EmptyState
          icon="🎁"
          title="Your list is empty, for now!"
          text="Add a few things you'd love. Your family picks from here, and it stays a surprise."
          actions={<AddGiftButton />}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {giftList.map((gift) => (
            <OwnGiftCard key={gift.id} gift={gift} />
          ))}
        </ul>
      )}
    </div>
  )
}
