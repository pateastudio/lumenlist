import type { Metadata } from "next"
import { headers } from "next/headers"
import { getCurrentUser } from "@/lib/auth/user"
import { joinPreview } from "@/lib/data/invites"
import { withAnonymous } from "@/lib/db/with-user"
import { normalizeJoinCode } from "@/lib/join-code"
import { LIMITS, hitLimits, requestIp } from "@/lib/rate-limit"
import { describeError } from "@/lib/log"
import { AuthFrame } from "@/components/auth/auth-frame"
import { EmojiTile, HowLumenWorks, LinkProblem, SignedOutChoices } from "@/components/auth/invite-landing"
import { JoinFamilyButton } from "@/components/family/join-family-button"

type Params = { params: Promise<{ inviteCode: string }> }

export const metadata: Metadata = { title: "Join a family" }

export default async function JoinPage({ params }: Params) {
  const { inviteCode: inviteCodeRaw } = await params
  const inviteCode = normalizeJoinCode(inviteCodeRaw)
  let family: { id: string; name: string } | null = null
  let lookupFailed = false
  let limited = false
  if (inviteCode) {
    // A request that didn't come through CloudFront has no trustworthy address: don't look it up.
    const ip = requestIp(await headers())
    try {
      if (!ip) throw new Error("no trusted client IP")
      // join_preview() returns only the family's id and name for a valid code; works signed out.
      // Every look counts against the visitor's address, found or not (src/lib/rate-limit.ts).
      const preview = await withAnonymous(async (tx) =>
        (await hitLimits(tx, LIMITS.joinPreview(ip))) ? "limited" : joinPreview(tx, inviteCode),
      )
      if (preview === "limited") limited = true
      else if (preview) family = { id: preview.family_id, name: preview.family_name }
    } catch (e) {
      lookupFailed = true
      console.error("[join-page] lookup failed:", describeError(e))
    }
  }

  if (limited) {
    return (
      <LinkProblem title="Too many tries" action={{ href: `/join/${inviteCode}`, label: "Try again" }}>
        We&apos;ve had a lot of requests from your connection. Wait a few minutes and try again.
      </LinkProblem>
    )
  }

  if (!family || !inviteCode) {
    if (inviteCode && lookupFailed) {
      return (
        <LinkProblem title="We can't check this link right now" action={{ href: `/join/${inviteCode}`, label: "Try again" }}>
          Something went wrong on our end. Give it a minute and try again.
        </LinkProblem>
      )
    }
    return (
      <LinkProblem title="Invite not found">
        This link doesn&apos;t work any more. The family may have reset it. Ask whoever invited you for a new one.
      </LinkProblem>
    )
  }

  const user = await getCurrentUser()

  return (
    <AuthFrame className="text-center">
      <EmojiTile emoji="🏡" />
      <h1 className="mt-5 font-display text-3xl leading-tight font-(weight:--display-weight) tracking-(--display-tracking)">Join {family.name}</h1>
      <p className="mt-2 text-base text-muted-foreground">You&apos;ve been invited to join this family on Lumen.</p>
      <HowLumenWorks />
      {user ? (
        <div className="mt-7 space-y-3">
          <JoinFamilyButton inviteCode={inviteCode} />
          <p className="text-sm text-muted-foreground">
            Signed in as{" "}<strong className="break-words text-foreground">{user.email}</strong>
          </p>
        </div>
      ) : (
        <SignedOutChoices next={`/join/${inviteCode}`} />
      )}
    </AuthFrame>
  )
}
