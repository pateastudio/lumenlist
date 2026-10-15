"use client"

import { useContext, useRef, useState } from "react"
import { toast } from "sonner"
import { ShoppingCard, type ShoppingRow } from "@/components/dashboard/shopping-card"
import { ClaimTransportContext } from "@/components/gifts/claim-transport"
import { Button } from "@/components/ui/button"
import { formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useDemoFamily } from "./demo/demo-family"
import { PEOPLE } from "./demo/family"
import styles from "./marketing.module.css"

const NAME_BY_ID = new Map<string, string>(Object.values(PEOPLE).map((p) => [p.id, p.name]))

/** The app's "You're shopping for" card, fed by the made-up family: claim a gift anywhere on the page and a row lands here. */
export function DemoShoppingCard() {
  const { shopping } = useDemoFamily()
  const transport = useContext(ClaimTransportContext)
  // What was there when the page opened; anything else arrived because the visitor claimed it.
  const [initial] = useState(() => new Set(shopping.map((g) => g.id)))
  const [saving, setSaving] = useState<string | null>(null)
  const rowEls = useRef(new Map<string, HTMLLIElement>())
  const changed = shopping.length !== initial.size || shopping.some((g) => !initial.has(g.id))

  async function markBought(id: string) {
    if (!transport) return
    setSaving(id)
    const ok = await transport(id, "PATCH", "purchased")
    setSaving(null)
    if (ok) {
      toast.success("Marked as bought!")
      // The button turns into a "Bought" pill: keep keyboard focus on the row instead of losing it to the page.
      rowEls.current.get(id)?.focus()
    }
  }

  const rows: ShoppingRow[] = shopping.map((g) => {
    const owner = NAME_BY_ID.get(g.owner_id)
    return {
      id: g.id,
      title: g.title,
      detail: [owner ? `for ${owner}` : null, formatPrice(g.price)].filter(Boolean).join(" · "),
      rowRef: (el: HTMLLIElement | null) => {
        if (el) rowEls.current.set(g.id, el)
        else rowEls.current.delete(g.id)
      },
      bought: g.gift_claims?.status === "purchased",
      // The row's highlight runs a little past the text on both sides.
      className: cn("-mx-2 px-2", !initial.has(g.id) && styles.freshRow),
      action: (
        <Button
          type="button"
          variant="ink-outline"
          className="h-11 shrink-0 px-3 @min-[19rem]:px-4"
          onClick={() => markBought(g.id)}
          disabled={saving === g.id}
          aria-label={`Mark ${g.title} as bought`}
        >
          {saving === g.id ? "Saving..." : "Mark bought"}
        </Button>
      ),
    }
  })

  return (
    <div data-demo-shopping className={cn(changed && (shopping.length % 2 ? styles.bumpA : styles.bumpB), "h-full")}>
      <ShoppingCard rows={rows} headingLevel="h3" compact emptyText={"Nothing yet. Tap \"I'll get this\" on a gift and it lands here."} className="h-full" />
    </div>
  )
}
