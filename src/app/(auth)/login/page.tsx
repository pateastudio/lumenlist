import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { AuthHeading } from "@/components/auth/auth-frame"
import { LoginForm } from "@/components/auth/login-form"

export const metadata: Metadata = { title: "Sign in" }

export default function LoginPage() {
  return (
    <>
      <AuthHeading title="Sign in" subtitle="Welcome back. Your family's lists are waiting." />
      <Suspense>
        <LoginForm />
      </Suspense>
      <p className="mt-6 text-center text-base text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/signup" prefetch={false} className="font-bold text-foreground underline underline-offset-4">
          Sign up
        </Link>
      </p>
    </>
  )
}
