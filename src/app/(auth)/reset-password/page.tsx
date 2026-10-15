import type { Metadata } from "next"
import { Suspense } from "react"
import { AuthHeading } from "@/components/auth/auth-frame"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"

export const metadata: Metadata = { title: "Choose a new password" }

// No session needed: the token in the link authorizes the reset.
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  return (
    <>
      {token ? (
        <AuthHeading title="Choose a new password" subtitle="Pick something you'll remember, then you're back in." />
      ) : (
        <AuthHeading title="This link has expired" />
      )}
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </>
  )
}
