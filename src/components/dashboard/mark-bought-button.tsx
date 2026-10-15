"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

/** Marks one of the signed-in user's own claims as purchased. Only rendered on gifts they claimed. */
export function MarkBoughtButton({ giftId, title }: { giftId: string; title: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function markBought() {
    setLoading(true)
    try {
      const res = await fetch(`/api/gifts/${giftId}/claim`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "purchased" }),
      })
      if (!res.ok) {
        toast.error("Couldn't update that gift")
        return
      }
      toast.success("Marked as bought!")
      router.refresh()
    } catch {
      toast.error("Couldn't update that gift")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="ink-outline"
      className="h-11 shrink-0 px-4"
      onClick={markBought}
      disabled={loading}
      aria-label={`Mark ${title} as bought`}
    >
      {loading ? "Saving..." : "Mark bought"}
    </Button>
  )
}
