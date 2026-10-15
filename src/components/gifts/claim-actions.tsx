"use client"

import { useContext, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check } from "lucide-react"
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
} from "@/components/ui/alert-dialog"
import type { ClaimChipState } from "@/components/shared/status-chip"
import { ClaimTransportContext } from "./claim-transport"

interface ClaimActionsProps {
  giftId: string
  /** Derived on the server from the claim row and the viewer. The page re-renders after every change. */
  state: Exclude<ClaimChipState, "neutral">
  /** The gift owner's short name, for the toasts and the confirm dialog. */
  ownerName: string
}

type Method = "POST" | "PATCH" | "DELETE"

/**
 * The one next step for a gift on someone else's list. Props are the single source of truth: each
 * change calls the claim API, then `router.refresh()`, and the buttons stay disabled until the new
 * state has rendered. A failed request shows a toast and leaves the state alone.
 * Someone else's claim has no actions at all (the chip says it).
 */
export function ClaimActions({ giftId, state, ownerName }: ClaimActionsProps) {
  const router = useRouter()
  // Set only by the marketing page, which keeps its made-up claims in memory.
  const preview = useContext(ClaimTransportContext)
  const [busy, setBusy] = useState(false)
  const [refreshing, startRefresh] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const disabled = busy || refreshing

  async function send(method: Method, status?: "claimed" | "purchased"): Promise<boolean> {
    setBusy(true)
    try {
      if (preview) return await preview(giftId, method, status)
      const res = await fetch(`/api/gifts/${giftId}/claim`, {
        method,
        headers: status ? { "Content-Type": "application/json" } : undefined,
        body: status ? JSON.stringify({ status }) : undefined,
      })
      return res.ok
    } catch {
      return false
    } finally {
      setBusy(false)
    }
  }

  function refresh() {
    if (preview) return
    startRefresh(() => router.refresh())
  }

  async function claim() {
    if (!(await send("POST", "claimed"))) return toast.error("Couldn't claim that. Try again.")
    toast.success(`It's yours! ${ownerName} won't know. 🤫`)
    refresh()
  }

  async function markBought() {
    if (!(await send("PATCH", "purchased"))) return toast.error("Couldn't mark that as bought. Try again.")
    toast.success("Marked as bought. Nice work! 🎉")
    refresh()
  }

  async function undoBought() {
    if (!(await send("PATCH", "claimed"))) return toast.error("Couldn't undo that. Try again.")
    toast.success("Back to \"You're getting this\".")
    refresh()
  }

  async function release() {
    setConfirmOpen(false)
    if (!(await send("DELETE"))) return toast.error("Couldn't let that go. Try again.")
    toast("It's back up for grabs.", {
      action: {
        label: "Undo",
        onClick: async () => {
          if (!(await send("POST", "claimed"))) return toast.error("Couldn't get it back. Try again.")
          refresh()
        },
      },
    })
    refresh()
  }

  if (state === "taken" || state === "taken-bought") return null

  if (state === "available") {
    return (
      <div data-claim-state={state} className="flex flex-col gap-2">
        <Button variant="ink" size="lg" className="w-full" onClick={claim} disabled={disabled}>
          I&apos;ll get this
        </Button>
      </div>
    )
  }

  if (state === "mine") {
    return (
      <div data-claim-state={state} className="flex flex-col gap-2">
        <Button variant="ink" size="lg" className="w-full" onClick={markBought} disabled={disabled}>
          <Check aria-hidden />
          I bought it
        </Button>
        <Button variant="ghost" size="lg" className="w-full text-muted-foreground" onClick={() => setConfirmOpen(true)} disabled={disabled}>
          Changed my mind
        </Button>
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Let someone else get this?</AlertDialogTitle>
              <AlertDialogDescription>
                It goes back on {ownerName}&apos;s list as up for grabs.{" "}
                {ownerName}{" "}still won&apos;t know.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep it</AlertDialogCancel>
              <AlertDialogAction onClick={release}>Yes, let it go</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }

  // mine-bought
  return (
    <div data-claim-state={state} className="flex flex-col gap-2">
      <Button variant="ghost" size="lg" className="w-full text-muted-foreground" onClick={undoBought} disabled={disabled}>
        Not bought yet? Undo
      </Button>
    </div>
  )
}
