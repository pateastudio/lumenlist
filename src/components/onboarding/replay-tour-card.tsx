"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Sparkles } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { postTourEvent } from "./tour-events"
import { clearLocal } from "./tour-local"

/** Account's way back into the tour, for everyone, finished or not. */
export function ReplayTourCard({ userId }: { userId: string }) {
  const router = useRouter()
  const [sending, setSending] = useState(false)
  // Pending for as long as the refresh takes, and over when it ends, however it ends.
  const [refreshing, startRefresh] = useTransition()

  async function again() {
    setSending(true)
    const ok = await postTourEvent({ event: "restart" })
    setSending(false)
    if (!ok) {
      toast.error("Couldn't start the tour. Try again.")
      return
    }
    clearLocal(userId)
    // The layout reads the new run and remounts the tour, and the walk takes them to its first
    // stop, on Home. No push from here: a push and a refresh asked for together reach the browser
    // as a replace, and Back from Home would then skip this page.
    startRefresh(() => router.refresh())
  }

  return (
    <Card variant="ink">
      <CardContent className="space-y-3">
        <div>
          <h2 className="font-display text-xl font-(weight:--display-weight)">New here, or need a refresher?</h2>
          <p className="mt-1 text-base text-muted-foreground">Take the quick tour again. It shows how lists, picking gifts and surprises work.</p>
        </div>
        <Button variant="ink-outline" size="lg" className="w-full" onClick={again} disabled={sending || refreshing}>
          <Sparkles aria-hidden /> Show me around again
        </Button>
      </CardContent>
    </Card>
  )
}
