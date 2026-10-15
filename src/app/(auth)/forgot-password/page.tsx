import type { Metadata } from "next"
import Link from "next/link"
import { AuthHeading } from "@/components/auth/auth-frame"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"

export const metadata: Metadata = { title: "Reset your password" }

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthHeading title="Reset your password" subtitle="No worries. Enter your email and we'll send you a reset link." />
      <ForgotPasswordForm />
      <p className="mt-6 text-center text-base text-muted-foreground">
        Remembered it?{" "}
        <Link href="/login" prefetch={false} className="font-bold text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </>
  )
}
