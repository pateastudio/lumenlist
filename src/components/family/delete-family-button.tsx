"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

/** Owner-only "Delete this family" button. The owner types the family's name to confirm. */
export function DeleteFamilyButton({ familyId, familyName }: { familyId: string; familyName: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const matches = typed.trim() === familyName

  async function remove() {
    if (!matches) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/families/${familyId}`, { method: "DELETE" })
      if (!res.ok) {
        setError("We couldn't delete the family. Please try again.")
        setLoading(false)
        return
      }
      toast.success(`${familyName} was deleted`)
      router.push("/families")
      router.refresh()
    } catch {
      setError("We couldn't delete the family. Check your connection and try again.")
      setLoading(false)
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setTyped("")
          setError(null)
        }
      }}
    >
      <AlertDialogTrigger
        render={<Button type="button" variant="ink-outline" size="lg" className="w-full bg-(color:--danger-surface) text-destructive sm:w-auto" />}
      >
        Delete this family
      </AlertDialogTrigger>
      <AlertDialogContent className="p-6 data-[size=default]:max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-xl font-(weight:--display-weight) break-words">
            Delete {familyName}?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            This removes the family for everyone in it. People keep their own lists, but nobody will see them
            through this family. You can&apos;t undo this.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="confirm-family-name" className="text-base">
            Type <span className="font-bold break-all">{familyName}</span> to confirm
          </Label>
          <Input
            id="confirm-family-name"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            className="h-12 text-base"
          />
        </div>
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
            disabled={!matches || loading}
            onClick={remove}
            className="w-full sm:w-auto"
          >
            {loading ? "Deleting…" : "Delete family"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
