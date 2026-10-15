import type { Metadata } from "next"
import { getCurrentUser } from "@/lib/auth/user"
import { invitePreview } from "@/lib/data/invites"
import { withAnonymous } from "@/lib/db/with-user"
import { AcceptInviteButton } from "@/components/family/accept-invite-button"
import { AuthFrame } from "@/components/auth/auth-frame"
import { HowLumenWorks, LinkProblem, SignedOutChoices } from "@/components/auth/invite-landing"
import { PersonAvatar } from "@/components/shared/person-avatar"

type Params = { params: Promise<{ token: string }> }

export const metadata: Metadata = { title: "You're invited" }

export default async function InvitePage({ params }: Params) {
  const { token } = await params
  // invite_preview() returns only the family and inviter names, for a valid, unused, unexpired token.
  const invite = await withAnonymous((tx) => invitePreview(tx, token)).catch(() => null)

  if (!invite) {
    return (
      <LinkProblem title="Invite not found">
        This invite link has expired or was already used. Ask whoever invited you for a new one.
      </LinkProblem>
    )
  }

  const user = await getCurrentUser()

  const familyName = invite.family_name || "a family"
  const inviterName = invite.inviter_name || "Someone"

  return (
    <AuthFrame className="text-center">
      <PersonAvatar id={inviterName} name={inviterName} size="xl" className="mx-auto" />
      <h1 className="mt-5 font-display text-3xl leading-tight font-(weight:--display-weight) tracking-(--display-tracking)">You&apos;re invited!</h1>
      <p className="mt-2 text-base text-muted-foreground">
        {inviterName} invited you to join <strong className="text-foreground">{familyName}</strong> on Lumen.
      </p>
      <HowLumenWorks />
      {user ? (
        <div className="mt-7 space-y-3">
          <AcceptInviteButton token={token} />
          <p className="text-sm text-muted-foreground">
            Signed in as{" "}<strong className="break-words text-foreground">{user.email}</strong>
          </p>
        </div>
      ) : (
        <SignedOutChoices next={`/invite/${token}`} />
      )}
    </AuthFrame>
  )
}
