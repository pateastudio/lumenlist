import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ThemePicker } from "@/components/account/theme-picker"
import { ChangeNameForm } from "@/components/account/change-name-form"
import { ChangePasswordForm } from "@/components/account/change-password-form"
import { SignOutButton } from "@/components/account/sign-out-button"
import { ReplayTourCard } from "@/components/onboarding/replay-tour-card"
import { PageHeader } from "@/components/shared/page-header"
import { PersonAvatar } from "@/components/shared/person-avatar"
import { Card, CardContent } from "@/components/ui/card"
import type { Profile } from "@/types"
import { getCurrentUser } from "@/lib/auth/user"
import { withUser } from "@/lib/db/with-user"
import { getProfile } from "@/lib/data/profiles"
import { legalPublished } from "@/lib/legal/published"

export const metadata: Metadata = { title: "Your account" }

export default async function AccountPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const profile: Pick<Profile, "name" | "email" | "avatar_url"> | null = await withUser(user.id, (tx) => getProfile(tx, user.id))

  const fallbackName = user.name.trim() || user.email.split("@")[0] || "—"
  const displayName = profile?.name?.trim() || fallbackName
  const displayEmail = profile?.email || user.email || "—"

  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <PageHeader title="Your account" />

      <Card variant="ink">
        <CardContent className="flex items-center gap-4">
          <PersonAvatar id={user.id} name={displayName} avatarUrl={profile?.avatar_url ?? null} size="xl" />
          <div className="min-w-0">
            <p className="font-display text-xl font-(weight:--display-weight-soft) break-words text-foreground">{displayName}</p>
            <p className="truncate text-sm text-muted-foreground" title={displayEmail}>{displayEmail}</p>
          </div>
        </CardContent>
      </Card>

      <ChangeNameForm name={displayName} />
      <ChangePasswordForm />

      <SignOutButton />

      <ThemePicker />

      <ReplayTourCard userId={user.id} />

      {legalPublished() && (
        <p className="flex justify-center gap-6 text-center text-sm text-muted-foreground">
          <Link href="/privacy" prefetch={false} className="flex min-h-11 items-center font-semibold underline underline-offset-4">
            Privacy
          </Link>
          <Link href="/terms" prefetch={false} className="flex min-h-11 items-center font-semibold underline underline-offset-4">
            Terms
          </Link>
        </p>
      )}
    </div>
  )
}
