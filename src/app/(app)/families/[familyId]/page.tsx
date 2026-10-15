import type { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ChevronRight, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { InviteSheet } from "@/components/family/invite-sheet"
import { TourHint } from "@/components/onboarding/steps/inline-hint"
import { BackLink } from "@/components/shared/back-link"
import { PersonAvatar } from "@/components/shared/person-avatar"
import { getCurrentUser } from "@/lib/auth/user"
import { withUser } from "@/lib/db/with-user"
import { getFamilyWithMembers } from "@/lib/data/families"

type Params = { params: Promise<{ familyId: string }> }

const MAX_STACK = 5

export const metadata: Metadata = { title: "Family" }

export default async function FamilyPage({ params }: Params) {
  const { familyId } = await params
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const family = await withUser(user.id, (tx) => getFamilyWithMembers(tx, familyId))

  if (!family) notFound()

  const isOwner = family.created_by === user.id
  const members = family.family_members
  const inviteLink = `${(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/join/${family.invite_code}`
  const shown = members.slice(0, MAX_STACK)
  const extra = members.length - shown.length

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <BackLink href="/families">Your families</BackLink>
        <Card variant="ink" className="gap-0 bg-hero p-6 text-foreground">
          <div className="flex items-center -space-x-2">
            {shown.map((m) => (
              <PersonAvatar
                key={m.user_id}
                id={m.user_id}
                name={m.profiles.name || m.profiles.email}
                avatarUrl={m.profiles.avatar_url}
                size="md"
                className="ring-[3px] ring-card"
              />
            ))}
            {extra > 0 ? (
              <span className="relative grid size-10 place-items-center rounded-full bg-card text-sm font-bold ring-[3px] ring-card">
                +{extra}
              </span>
            ) : null}
          </div>
          <h1 className="mt-4 font-display text-3xl leading-tight font-(weight:--display-weight) tracking-(--display-tracking) break-words sm:text-4xl">
            {family.name}
          </h1>
          <p className="mt-1 text-base text-foreground/80">
            {members.length} {members.length === 1 ? "person" : "people"} sharing lists
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <InviteSheet familyId={familyId} familyName={family.name} link={inviteLink} canReset={isOwner} />
            {isOwner ? (
              <Button asChild variant="ink-outline" size="lg" className="w-full sm:w-auto">
                <Link prefetch={false} href={`/families/${familyId}/settings`}>
                  <Settings aria-hidden />
                  Settings
                </Link>
              </Button>
            ) : null}
          </div>
          {/* In the flow, under the buttons: a floating bubble here hid the family's name on phones and the heading below on wide screens. */}
          <TourHint id="invite">Send this link to your family. That&apos;s all it takes.</TourHint>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-2xl font-(weight:--display-weight)">Everyone&apos;s lists</h2>
        <Card data-tour="family-lists" variant="ink" className="gap-0 py-0">
          <ul className="divide-y divide-border">
            {members.map((member) => {
              const isCurrentUser = member.user_id === user.id
              const name = member.profiles.name || member.profiles.email
              const href = isCurrentUser ? "/gifts" : `/members/${member.user_id}?familyId=${familyId}`
              return (
                <li key={member.user_id}>
                  <Link
                    prefetch={false}
                    href={href}
                    className="flex min-h-16 items-center gap-4 px-4 py-3 transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                  >
                    <PersonAvatar id={member.user_id} name={name} avatarUrl={member.profiles.avatar_url} size="lg" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-bold">
                        {name}
                        {isCurrentUser ? <span className="font-normal text-muted-foreground"> (you)</span> : null}
                      </p>
                      {member.role === "owner" ? <p className="text-sm text-muted-foreground">Owner</p> : null}
                    </div>
                    <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              )
            })}
          </ul>
        </Card>
      </section>
    </div>
  )
}
