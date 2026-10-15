"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { AuthError } from "@/components/auth/auth-frame"
import { authClient } from "@/lib/auth/client"
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations"

export function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  })

  async function onSubmit(data: ForgotPasswordInput) {
    setLoading(true)
    setSubmitError(null)
    // Same response whether or not the email has an account.
    const { error } = await authClient.requestPasswordReset({ email: data.email, redirectTo: "/reset-password" })
    if (error) {
      setSubmitError("Something went wrong. Please try again.")
      setLoading(false)
      return
    }
    setSubmittedEmail(data.email)
    setLoading(false)
  }

  if (submittedEmail) {
    return (
      <div className="space-y-3 text-center">
        <h2 className="font-display text-2xl font-(weight:--display-weight)">Check your email</h2>
        <p className="text-base text-muted-foreground">
          If an account exists for <strong>{submittedEmail}</strong>, we sent a link to reset
          your password.
        </p>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-bold">Email</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" placeholder="you@example.com" className="h-12 text-base md:text-base" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <AuthError message={submitError} />
        <Button type="submit" variant="ink" size="lg" className="w-full" disabled={loading}>
          {loading ? "Sending…" : "Send reset link"}
        </Button>
      </form>
    </Form>
  )
}
