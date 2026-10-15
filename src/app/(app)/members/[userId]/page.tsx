import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { MemberListHeader } from "@/components/gifts/member-list-header"
import { TheirGiftList } from "@/components/gifts/their-gift-list"
import { BackLink } from "@/components/shared/back-link"
import { EmptyState } from "@/components/shared/empty-state"
import { shortName } from "@/lib/format"
import { getCurrentUser } from "@/lib/auth/user"
import { withUser } from "@/lib/db/with-user"
import { getProfile } from "@/lib/data/profiles"
import { listGiftsWithClaims } from "@/lib/data/gifts"

// Static: a per-person title would need a second database round trip just for the tab.
export const metadata: Metadata = { title: "Family list" }

type Params = {
  params: Promise<{ userId: string }>
  searchParams: Promise<{ familyId?: string }>
}

export default async function MemberWishlistPage({ params, searchParams }: Params) {
  const { userId } = await params
  const { familyId } = await searchParams

  const user = await getCurrentUser()
  if (!user) redirect("/login")

  if (userId === user.id) redirect("/gifts")

  // Claims come back as RLS allows: a family member sees them; nobody sees their own.
  const [profile, gifts] = await withUser(user.id, (tx) =>
    Promise.all([getProfile(tx, userId), listGiftsWithClaims(tx, userId)]),
  )

  // RLS (profiles_select, drizzle/0007) returns someone else's profile only when you share a family
  // with them, so no profile means a stranger, a former family member or no such user: all a 404.
  // tests/db/member-page.test.ts covers each.
  if (!profile) notFound()

  const displayName = profile.name || profile.email
  const who = shortName(displayName)
  const openCount = gifts.filter((g) => !g.gift_claims).length

  return (
    <div>
      <BackLink href={familyId ? `/families/${familyId}` : "/dashboard"}>
        {familyId ? "Back to family" : "Back to home"}
      </BackLink>

      <MemberListHeader
        id={userId}
        name={displayName}
        avatarUrl={profile.avatar_url}
        shortName={who}
        giftCount={gifts.length}
        openCount={openCount}
      />

      {gifts.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon="🎁"
          title="Nothing here yet"
          text={`${displayName} hasn't added any gifts yet.`}
        />
      ) : (
        <TheirGiftList gifts={gifts} currentUserId={user.id} ownerName={who} />
      )}
    </div>
  )
}
