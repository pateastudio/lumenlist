"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { createFamilySchema, type CreateFamilyInput } from "@/lib/validations"

/** Owner-only inline form that renames the family (PATCH /api/families/[id]). */
export function RenameFamilyForm({ familyId, currentName }: { familyId: string; currentName: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<CreateFamilyInput>({
    resolver: zodResolver(createFamilySchema),
    defaultValues: { name: currentName },
  })

  async function onSubmit(data: CreateFamilyInput) {
    if (data.name.trim() === currentName) {
      toast.success("That's already the name")
      return
    }
    setLoading(true)
    setSubmitError(null)
    try {
      const res = await fetch(`/api/families/${familyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name.trim() }),
      })
      if (!res.ok) {
        setSubmitError("We couldn't rename the family. Please try again.")
        return
      }
      toast.success("Family renamed")
      router.refresh()
    } catch {
      setSubmitError("We couldn't rename the family. Check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base">Family name</FormLabel>
              <div className="flex flex-col gap-2 sm:flex-row">
                <FormControl>
                  <Input autoComplete="off" className="h-12 text-base sm:flex-1" {...field} />
                </FormControl>
                <Button type="submit" variant="ink" size="lg" disabled={loading} className="sm:shrink-0">
                  {loading ? "Saving…" : "Save"}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        {submitError ? (
          <p className="text-sm text-destructive" role="alert">
            {submitError}
          </p>
        ) : null}
      </form>
    </Form>
  )
}
