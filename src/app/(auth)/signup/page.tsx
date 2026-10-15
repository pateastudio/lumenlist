import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { AuthHeading } from "@/components/auth/auth-frame"
import { SignupForm } from "@/components/auth/signup-form"
import { LegalLine } from "@/components/legal/legal-line"
import { FREE_LINE } from "@/components/marketing/copy"

export const metadata: Metadata = { title: "Create an account" }

export default function SignupPage() {
  return (
    <>
      <AuthHeading title="Create an account" subtitle={`${FREE_LINE} Then share your list with family.`} />
      <Suspense>
        <SignupForm />
      </Suspense>
      <LegalLine />
      <p className="mt-6 text-center text-base text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" prefetch={false} className="font-bold text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </>
  )
}
