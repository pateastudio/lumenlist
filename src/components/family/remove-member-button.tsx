"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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

type RemoveMemberButtonProps = {
  familyId: string
  familyName: string
  userId: string
  name: string
}

/** Owner-only "Remove" action for one member row, behind a confirmation. */
export function RemoveMemberButton({ familyId, familyName, userId, name }: RemoveMemberButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function remove() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/families/${familyId}/members?userId=${encodeURIComponent(userId)}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        setError(`We couldn't remove ${name}. Please try again.`)
        return
      }
      toast.success(`${name} was removed`)
      setOpen(false)
      router.refresh()
    } catch {
      setError(`We couldn't remove ${name}. Check your connection and try again.`)
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
      <AlertDialogTrigger
        render={<Button type="button" variant="ink-outline" className="h-11 shrink-0 bg-(color:--danger-surface) px-4 text-destructive" />}
        aria-label={`Remove ${name}`}
      >
        Remove
      </AlertDialogTrigger>
      <AlertDialogContent className="p-6 data-[size=default]:max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-xl font-(weight:--display-weight) break-words">
            Remove {name} from {familyName}?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            They won&apos;t see this family&apos;s lists any more. Their own list isn&apos;t deleted, and they can
            rejoin with an invite.
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
          <AlertDialogAction
            variant="destructive"
            size="lg"
            disabled={loading}
            onClick={remove}
            className="w-full sm:w-auto"
          >
            {loading ? "Removing…" : "Remove"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
