"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
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
import { createFamilySchema, type CreateFamilyInput } from "@/lib/validations"

export function CreateFamilyForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<CreateFamilyInput>({
    resolver: zodResolver(createFamilySchema),
    defaultValues: { name: "" },
  })

  async function onSubmit(data: CreateFamilyInput) {
    setLoading(true)
    setSubmitError(null)
    const res = await fetch("/api/families", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) {
      const message = json.error ?? "Couldn't create the family. Try again."
      toast.error(message)
      setSubmitError(message)
      setLoading(false)
      return
    }
    router.replace(`/families/${json.family.id}`)
    router.refresh()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base">Family name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. The Rivera Family" autoComplete="off" className="h-12 text-base" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" variant="ink" size="lg" disabled={loading} className="w-full sm:w-auto">
          {loading ? "Creating…" : "Create family"}
        </Button>
        {submitError && (
          <p className="text-sm text-destructive" role="alert">
            {submitError}
          </p>
        )}
      </form>
    </Form>
  )
}
