"use client"

import { useState } from "react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { giftState, TheirGiftCard } from "./their-gift-card"
import { cn } from "@/lib/utils"
import type { GiftWithClaim } from "@/types"

type Filter = "all" | "open" | "mine"

/**
 * Someone's list with the All / Up for grabs / Mine filter. Filters the gifts the page already
 * loaded; the filter lives in state, so it survives the `router.refresh()` after a claim.
 */
export function TheirGiftList({
  gifts,
  currentUserId,
  ownerName,
  columns = "auto",
}: {
  gifts: GiftWithClaim[]
  currentUserId: string
  ownerName: string
  /** `one` keeps a single column at every width, for a list drawn inside something narrow. */
  columns?: "auto" | "one"
}) {
  const [filter, setFilter] = useState<Filter>("all")

  const shown = gifts.filter((g) => {
    const state = giftState(g, currentUserId)
    if (filter === "open") return state === "available"
    if (filter === "mine") return state === "mine" || state === "mine-bought"
    return true
  })

  return (
    <div className="mt-5">
      <ToggleGroup
        data-tour="their-filter"
        value={[filter]}
        onValueChange={(v) => {
          // Never empty: ignore deselecting the active item.
          if (v[0]) setFilter(v[0] as Filter)
        }}
        variant="outline"
        aria-label="Show"
        className="w-full sm:w-auto"
      >
        <ToggleGroupItem value="all" className="h-11 min-h-11 flex-1 px-4 font-semibold sm:flex-none">All</ToggleGroupItem>
        <ToggleGroupItem value="open" className="h-11 min-h-11 flex-1 px-4 font-semibold sm:flex-none">Up for grabs</ToggleGroupItem>
        <ToggleGroupItem value="mine" className="h-11 min-h-11 flex-1 px-4 font-semibold sm:flex-none">Mine</ToggleGroupItem>
      </ToggleGroup>

      {shown.length === 0 ? (
        <p className="mt-6 text-center text-muted-foreground">Nothing here. Try <strong className="text-foreground">All</strong>.</p>
      ) : (
        <ul className={cn("mt-5 grid grid-cols-1 gap-4", columns === "auto" && "md:grid-cols-2 xl:grid-cols-3")}>
          {shown.map((gift) => (
            <li key={gift.id}>
              <TheirGiftCard gift={gift} currentUserId={currentUserId} ownerName={ownerName} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
