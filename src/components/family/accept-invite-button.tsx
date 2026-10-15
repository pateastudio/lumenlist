"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

export function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function accept() {
    setLoading(true)
    const res = await fetch(`/api/invite/${token}`, { method: "POST" })
    const json = await res.json()
    if (!res.ok) {
      toast.error(json.error ?? "Couldn't accept the invite. Try again.")
      setLoading(false)
      return
    }
    router.push(`/families/${json.familyId}`)
  }

  return (
    <Button variant="ink" className="w-full" onClick={accept} disabled={loading} size="lg">
      {loading ? "Joining…" : "Accept invitation"}
    </Button>
  )
}
