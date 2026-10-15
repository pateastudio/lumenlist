"use client"

import { useState } from "react"
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
import { inviteMemberSchema, type InviteMemberInput } from "@/lib/validations"

export function InviteMemberForm({ familyId }: { familyId: string }) {
  const [loading, setLoading] = useState(false)

  const form = useForm<InviteMemberInput>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { email: "" },
  })

  async function onSubmit(data: InviteMemberInput) {
    setLoading(true)
    const res = await fetch(`/api/families/${familyId}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (res.status === 429) {
      toast.error("You've sent a lot of invites. Wait a while and try again.")
    } else if (!res.ok) {
      toast.error("Couldn't send the invite. Try again.")
    } else {
      toast.success(`Invite sent to ${data.email}`)
      form.reset()
    }
    setLoading(false)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base">Send them an email</FormLabel>
              <div className="flex flex-col gap-2 sm:flex-row">
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="family@example.com"
                    className="h-12 text-base sm:flex-1"
                    {...field}
                  />
                </FormControl>
                <Button type="submit" variant="ink-outline" size="lg" disabled={loading} className="sm:shrink-0">
                  {loading ? "Sending…" : "Send invite"}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
}
