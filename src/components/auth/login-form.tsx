"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
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
import { PasswordInput } from "@/components/auth/password-input"
import { authClient } from "@/lib/auth/client"
import { loginSchema, safeNextPath, type LoginInput } from "@/lib/validations"

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  async function onSubmit(data: LoginInput) {
    setLoading(true)
    setSubmitError(null)
    const { error } = await authClient.signIn.email({ email: data.email, password: data.password })
    if (error) {
      // 403: right password, email not confirmed yet. 429: too many attempts from here.
      const message =
        error.status === 403
          ? "Check your email to confirm your account first."
          : error.status === 429
            ? "Too many attempts. Wait a minute and try again."
            : "Invalid email or password"
      setSubmitError(message)
      setLoading(false)
      return
    }
    const next = safeNextPath(searchParams.get("next"))
    router.replace(next)
    router.refresh()
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
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between gap-3">
                <FormLabel className="text-base font-bold">Password</FormLabel>
                <Link href="/forgot-password" prefetch={false} className="text-sm font-medium font-bold text-foreground underline underline-offset-4">
                  Forgot password?
                </Link>
              </div>
              <FormControl>
                <PasswordInput autoComplete="current-password" placeholder="Your password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" variant="ink" size="lg" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
        <AuthError message={submitError} />
      </form>
    </Form>
  )
}
