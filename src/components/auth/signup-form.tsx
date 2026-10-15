"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
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
  FormDescription,
  FormMessage,
} from "@/components/ui/form"
import { AuthError } from "@/components/auth/auth-frame"
import { PasswordInput } from "@/components/auth/password-input"
import { authClient } from "@/lib/auth/client"
import { safeNextPath, signupSchema, type SignupInput } from "@/lib/validations"

export function SignupForm() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "" },
  })

  async function onSubmit(data: SignupInput) {
    setLoading(true)
    setSubmitError(null)
    const next = safeNextPath(searchParams.get("next"))
    // Better Auth answers the same for new and existing emails (email verification is required),
    // so the only error worth showing is one that isn't about the account.
    const { error } = await authClient.signUp.email({ ...data, callbackURL: next })
    if (error) {
      const message = "Something went wrong. Please try again."
      setSubmitError(message)
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
          We sent a confirmation link to <strong>{submittedEmail}</strong>. Click it to finish
          creating your account, then come back and sign in.
        </p>
        <p className="text-base text-muted-foreground">
          Didn&apos;t get it? Check spam, or{" "}
          <button
            type="button"
            className="inline-flex min-h-11 items-center font-bold text-foreground underline underline-offset-4"
            onClick={() => setSubmittedEmail(null)}
          >
            try again
          </button>
          .
        </p>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-bold">Name</FormLabel>
              <FormControl>
                <Input autoComplete="name" placeholder="Your name" className="h-12 text-base md:text-base" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-bold">Password</FormLabel>
              <FormControl>
                <PasswordInput autoComplete="new-password" placeholder="At least 8 characters" {...field} />
              </FormControl>
              <FormDescription>Use at least 8 characters.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" variant="ink" size="lg" className="w-full" disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </Button>
        <AuthError message={submitError} />
      </form>
    </Form>
  )
}
