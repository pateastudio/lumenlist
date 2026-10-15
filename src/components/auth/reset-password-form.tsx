"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  FormMessage,
} from "@/components/ui/form"
import { AuthError } from "@/components/auth/auth-frame"
import { PasswordInput } from "@/components/auth/password-input"
import { authClient } from "@/lib/auth/client"
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validations"

export function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // The reset email links to /api/auth/reset-password/<token>, which redirects here with
  // ?token=... (or ?error=INVALID_TOKEN when the link is stale).
  const token = searchParams.get("token")
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  })

  async function onSubmit(data: ResetPasswordInput) {
    setLoading(true)
    setSubmitError(null)
    if (!token) return
    const { error } = await authClient.resetPassword({ newPassword: data.password, token })
    if (error) {
      const message = "This reset link has expired. Request a new one."
      setSubmitError(message)
      setLoading(false)
      return
    }
    toast.success("Password updated. Sign in with your new password.")
    router.replace("/login")
  }

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-base text-muted-foreground">
          It may have been used already. Request a new one and we&apos;ll email it
          right over.
        </p>
        <Button asChild variant="ink" size="lg" className="w-full">
          <Link href="/forgot-password" prefetch={false}>
            Request a new link
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-bold">New password</FormLabel>
              <FormControl>
                <PasswordInput autoComplete="new-password" placeholder="At least 8 characters" {...field} />
              </FormControl>
              <FormDescription>Use at least 8 characters.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-bold">Confirm password</FormLabel>
              <FormControl>
                <PasswordInput autoComplete="new-password" placeholder="Type it again" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" variant="ink" size="lg" className="w-full" disabled={loading}>
          {loading ? "Updating…" : "Update password"}
        </Button>
        <AuthError message={submitError} />
      </form>
    </Form>
  )
}
