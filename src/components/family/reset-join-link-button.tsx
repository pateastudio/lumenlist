"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

/** Owner-only "Reset link": a new join code, behind a confirmation. The old link stops working. */
export function ResetJoinLinkButton({ familyId }: { familyId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function reset() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/families/${familyId}/join-code`, { method: "POST" })
      if (!res.ok) {
        setError("We couldn't reset the link. Please try again.")
        return
      }
      toast.success("New link ready. The old one no longer works.")
      setOpen(false)
      router.refresh()
    } catch {
      setError("We couldn't reset the link. Check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setError(null)
      }}
    >
      <AlertDialogTrigger render={<Button type="button" variant="ink-outline" size="lg" className="w-full sm:w-auto" />}>
        <RefreshCw aria-hidden />
        Reset link
      </AlertDialogTrigger>
      <AlertDialogContent className="p-6 data-[size=default]:max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-xl font-(weight:--display-weight)">Reset the invite link?</AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            The old link stops working right away. Everyone already in the family stays in. Share the new link with
            anyone you still want to invite.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter className="-mx-6 -mb-6 p-6">
          <AlertDialogCancel size="lg" className="w-full sm:w-auto">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction size="lg" disabled={loading} onClick={reset} className="w-full sm:w-auto">
            {loading ? "Resetting…" : "Reset link"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
