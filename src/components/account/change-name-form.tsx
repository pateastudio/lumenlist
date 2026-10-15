"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth/client"

// Form-local, like signupSchema's rules: 1 to 100 characters.
const nameSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(100, "Keep your name under 100 characters"),
})
type NameInput = z.infer<typeof nameSchema>

export function ChangeNameForm({ name }: { name: string }) {
  const router = useRouter()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<NameInput>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name },
  })

  async function onSubmit(data: NameInput) {
    setSubmitError(null)
    // Better Auth's databaseHooks.user.update copies the name into profiles.
    const { error } = await authClient.updateUser({ name: data.name })
    if (error) {
      setSubmitError("Something went wrong. Please try again.")
      return
    }
    form.reset({ name: data.name })
    toast.success("Name updated")
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Change your name</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      className="h-12 text-base md:text-base"
                      autoComplete="name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {submitError ? (
              <p className="text-sm text-destructive" role="alert">
                {submitError}
              </p>
            ) : null}
            <Button
              type="submit"
              variant="ink"
              size="lg"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Saving…" : "Save name"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
