"use client"

import { useState } from "react"
import { ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { GiftImage } from "@/components/shared/gift-image"
import { StatusChip, type ClaimChipState } from "@/components/shared/status-chip"
import { formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"
import { ClaimActions } from "./claim-actions"
import { StoreLink } from "./store-link"
import type { GiftWithClaim } from "@/types"

export type TheirGiftState = Exclude<ClaimChipState, "neutral">

function storeName(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

/** What the viewer sees for a gift: no claim, their own claim, or someone else's. */
export function giftState(gift: GiftWithClaim, currentUserId: string): TheirGiftState {
  const claim = gift.gift_claims
  if (!claim) return "available"
  const purchased = claim.status === "purchased"
  if (claim.claimed_by === currentUserId) return purchased ? "mine-bought" : "mine"
  return purchased ? "taken-bought" : "taken"
}

/**
 * A gift on someone else's list, as a family member sees it. Tapping the image/title area opens
 * a details sheet with the full notes and the same actions. Never render this for the gift's owner.
 */
export function TheirGiftCard({ gift, currentUserId, ownerName }: { gift: GiftWithClaim; currentUserId: string; ownerName: string }) {
  const [open, setOpen] = useState(false)
  const state = giftState(gift, currentUserId)
  const mine = state === "mine" || state === "mine-bought"
  const taken = state === "taken" || state === "taken-bought"

  const price = formatPrice(gift.price)
  const store = gift.url ? storeName(gift.url) : null

  const storeButton = gift.url ? (
    <Button asChild variant="ink-outline" size="lg" className="w-full">
      <StoreLink href={gift.url}>
        <ExternalLink aria-hidden />
        <span className="min-w-0 truncate">{store}</span>
      </StoreLink>
    </Button>
  ) : null

  return (
    <Card variant="ink" className={cn("h-full gap-0 py-0", taken && "bg-muted/60", mine && "outline-[3px] outline-offset-2 outline-primary")}>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`${gift.title}, details`}
          className="flex gap-4 rounded-md text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <GiftImage
            src={gift.image_url}
            title=""
            id={gift.id}
            ratio="square"
            className={cn("size-22 shrink-0 rounded-md border-(length:--ink-width) border-border-strong", taken && "opacity-60 grayscale")}
          />
          <span className="block min-w-0 flex-1">
            <span className="block font-display text-lg leading-snug font-(weight:--display-weight-soft) break-words">{gift.title}</span>
            <span className="mt-0.5 block text-muted-foreground">
              {price ? <span className="font-display text-xl font-(weight:--display-weight) text-foreground">{price}</span> : null}
              {store ? (
                <span className="break-all">
                  {price ? " · " : ""}
                  {store}
                </span>
              ) : null}
            </span>
            {gift.description ? <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">{gift.description}</span> : null}
          </span>
        </button>
        <StatusChip state={state} className="self-start" />
        <div className="mt-auto flex flex-col gap-2 pt-1">
          <ClaimActions giftId={gift.id} state={state} ownerName={ownerName} />
          {storeButton}
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="mx-auto max-h-[90vh] max-w-lg gap-4 overflow-y-auto rounded-t-3xl p-6 pt-14">
          <GiftImage
            src={gift.image_url}
            title={gift.title}
            id={gift.id}
            ratio="3/2"
            className={cn("rounded-md border-(length:--ink-width) border-border-strong", taken && "opacity-60 grayscale")}
          />
          <SheetHeader className="p-0">
            <SheetTitle className="font-display text-2xl leading-snug font-(weight:--display-weight) break-words">{gift.title}</SheetTitle>
            <SheetDescription className="text-base break-all">
              {[price, store].filter(Boolean).join(" · ") || "No price or store given"}
            </SheetDescription>
          </SheetHeader>
          {gift.description ? <p className="text-base leading-relaxed break-words whitespace-pre-line">{gift.description}</p> : null}
          <StatusChip state={state} className="self-start" />
          <div className="flex flex-col gap-2">
            <ClaimActions giftId={gift.id} state={state} ownerName={ownerName} />
            {storeButton}
          </div>
        </SheetContent>
      </Sheet>
    </Card>
  )
}
