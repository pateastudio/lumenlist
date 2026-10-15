"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { EllipsisVertical, ExternalLink, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { GiftImage } from "@/components/shared/gift-image"
import { Card } from "@/components/ui/card"
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { formatPrice } from "@/lib/format"
import type { Gift } from "@/types"
import { StoreLink, useIsExample } from "./store-link"

function storeName(url: string | null): string | null {
  if (!url) return null
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

/** The owner's card on /gifts: no claim data of any kind, by design. */
export function OwnGiftCard({ gift }: { gift: Gift }) {
  const router = useRouter()
  const example = useIsExample()
  const [confirming, setConfirming] = useState(false)
  const [removing, setRemoving] = useState(false)

  const price = formatPrice(gift.price)
  const store = storeName(gift.url)

  async function remove() {
    setRemoving(true)
    try {
      const res = await fetch(`/api/gifts/${gift.id}`, { method: "DELETE" })
      if (!res.ok) {
        toast.error("Couldn't remove that gift. Try again.")
        return
      }
      setConfirming(false)
      toast.success("Removed from your list.")
      router.refresh()
    } catch {
      toast.error("Couldn't remove that gift. Try again.")
    } finally {
      setRemoving(false)
    }
  }

  return (
    <li className="min-w-0">
      <Card variant="ink" className="h-full flex-row gap-4 p-4">
        <div className="w-20 shrink-0 self-start overflow-hidden rounded-lg">
          <GiftImage src={gift.image_url} title={gift.title} id={gift.id} ratio="square" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg leading-snug font-bold break-words">{gift.title}</h3>
          {price && <p className="font-display text-xl font-(weight:--display-weight) text-foreground">{price}</p>}
          {gift.description && <p className="mt-1 line-clamp-2 text-sm break-words text-muted-foreground">{gift.description}</p>}
          {store && gift.url && (
            <StoreLink
              href={gift.url}
              className="mt-1 inline-flex min-h-11 max-w-full items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <span className="truncate">{store}</span>
              <ExternalLink className="size-3.5 shrink-0" aria-hidden />
              {example ? null : <span className="sr-only">(opens the store in a new tab)</span>}
            </StoreLink>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Options for ${gift.title}`}
            className="-mt-1 -mr-1 flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <EllipsisVertical className="size-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuItem className="h-11 gap-3 text-base" onClick={() => router.push(`/gifts/${gift.id}/edit`)}>
              <Pencil className="size-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" className="h-11 gap-3 text-base" onClick={() => setConfirming(true)}>
              <Trash2 className="size-4" /> Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Card>

      <AlertDialog open={confirming} onOpenChange={(o) => !removing && setConfirming(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove “{gift.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              It comes off your list for everyone. If someone already got it for you, they&apos;ll see it&apos;s gone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Keep it</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={removing} onClick={remove}>
              {removing ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  )
}
