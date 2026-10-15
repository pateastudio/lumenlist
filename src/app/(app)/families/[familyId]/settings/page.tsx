import { TriangleAlert } from "lucide-react"
import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { Card } from "@/components/ui/card"
import { BackLink } from "@/components/shared/back-link"
import { PageHeader } from "@/components/shared/page-header"
import { PersonAvatar } from "@/components/shared/person-avatar"
import { InviteSheet } from "@/components/family/invite-sheet"
import { RenameFamilyForm } from "@/components/family/rename-family-form"
import { RemoveMemberButton } from "@/components/family/remove-member-button"
import { DeleteFamilyButton } from "@/components/family/delete-family-button"
import { getCurrentUser } from "@/lib/auth/user"
import { withUser } from "@/lib/db/with-user"
import { getFamilyWithMembers } from "@/lib/data/families"

type Params = { params: Promise<{ familyId: string }> }

export const metadata: Metadata = { title: "Family settings" }

export default async function FamilySettingsPage({ params }: Params) {
  const { familyId } = await params
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const family = await withUser(user.id, (tx) => getFamilyWithMembers(tx, familyId))
  if (!family) notFound()

  const isOwner = family.created_by === user.id
  const members = family.family_members
  const inviteLink = `${(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/join/${family.invite_code}`

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <BackLink href={`/families/${familyId}`}>{family.name}</BackLink>
        <PageHeader title={`${family.name} settings`} />
      </div>

      {!isOwner ? (
        <p className="rounded-lg bg-muted px-4 py-3 text-base">
          Only the family owner can change these settings. You can still see who is here and invite someone.
        </p>
      ) : null}

      {isOwner ? (
        <section className="space-y-3">
          <h2 className="font-display text-2xl font-(weight:--display-weight)">Family name</h2>
          <Card variant="ink" className="gap-0 p-4">
            <RenameFamilyForm familyId={familyId} currentName={family.name} />
          </Card>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-display text-2xl font-(weight:--display-weight)">Invite</h2>
        <Card variant="ink" className="gap-3 p-4">
          <p className="text-base text-muted-foreground">Share a link or send an email to bring someone in.</p>
          <div className="flex">
            <InviteSheet familyId={familyId} familyName={family.name} link={inviteLink} canReset={isOwner} />
          </div>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl font-(weight:--display-weight)">Members</h2>
        <Card variant="ink" className="gap-0 py-0">
          <ul className="divide-y divide-border">
            {members.map((member) => {
              const name = member.profiles.name || member.profiles.email
              const isCurrentUser = member.user_id === user.id
              const isMemberOwner = member.user_id === family.created_by
              return (
                <li key={member.user_id} className="flex min-h-16 items-center gap-4 px-4 py-3">
                  <PersonAvatar id={member.user_id} name={name} avatarUrl={member.profiles.avatar_url} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-bold">
                      {name}
                      {isCurrentUser ? <span className="font-normal text-muted-foreground"> (you)</span> : null}
                    </p>
                    {isMemberOwner ? <p className="text-sm text-muted-foreground">Owner</p> : null}
                  </div>
                  {isOwner && !isMemberOwner ? (
                    <RemoveMemberButton
                      familyId={familyId}
                      familyName={family.name}
                      userId={member.user_id}
                      name={name}
                    />
                  ) : null}
                </li>
              )
            })}
          </ul>
        </Card>
      </section>

      {isOwner ? (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 font-display text-2xl font-(weight:--display-weight) text-destructive">
            <TriangleAlert className="size-5 shrink-0" aria-hidden />
            Danger zone
          </h2>
          <Card variant="ink" className="gap-3 p-4">
            <p className="text-base text-muted-foreground">
              Deleting the family removes it for everyone. People keep their own lists.
            </p>
            <div className="flex">
              <DeleteFamilyButton familyId={familyId} familyName={family.name} />
            </div>
          </Card>
        </section>
      ) : null}
    </div>
  )
}
