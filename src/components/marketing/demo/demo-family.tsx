"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"
import { toast } from "sonner"
import { ClaimTransportContext, type ClaimTransport } from "@/components/gifts/claim-transport"
import type { Gift, GiftWithClaim } from "@/types"
import { applyClaim, giftsOf, initialGifts, ownGiftsOf, shoppingOf, type PersonKey } from "./family"

type DemoFamilyValue = {
  /** Someone's list as the visitor (Sam) sees it, claims included. Never use it for Sam's own list. */
  giftsFor: (owner: Exclude<PersonKey, "sam">) => GiftWithClaim[]
  /** A list as its owner sees it: no claim data at all. */
  ownGifts: (owner: PersonKey) => Gift[]
  /** What the visitor has claimed. */
  shopping: GiftWithClaim[]
}

const DemoFamilyContext = createContext<DemoFamilyValue | null>(null)

/**
 * Holds the made-up family's gifts and claims in memory and hands the real `ClaimActions` a
 * transport that changes them. Everything inside behaves like the app, and nothing leaves the page.
 */
export function DemoFamily({ children }: { children: React.ReactNode }) {
  const [gifts, setGifts] = useState(initialGifts)

  const transport = useCallback<ClaimTransport>(async (giftId, method, status) => {
    // A short pause, so the buttons show their busy state as they do in the app.
    await new Promise((r) => setTimeout(r, 250))
    setGifts((all) => applyClaim(all, giftId, method, status, new Date().toISOString()))
    return true
  }, [])

  const value = useMemo<DemoFamilyValue>(
    () => ({
      giftsFor: (owner) => giftsOf(gifts, owner),
      ownGifts: (owner) => ownGiftsOf(gifts, owner),
      shopping: shoppingOf(gifts),
    }),
    [gifts],
  )

  // The examples are examples: a store button on a card goes nowhere. On an example card it is a
  // real <button> with no address in it (`StoreLink`); this answers it with a toast. Any outside
  // link that still turns up in here is stopped too, as a backstop. React events from the details
  // sheet (a portal) reach this handler; links within the site itself still work.
  function stopOutsideLinks(e: React.MouseEvent) {
    const target = e.target as Element
    const example = e.type === "click" && target.closest?.("[data-example-link]")
    if (!example) {
      const href = target.closest?.("a[href]")?.getAttribute("href")
      if (!href || (href.startsWith("/") && !href.startsWith("//")) || href.startsWith("#")) return
      e.preventDefault()
    }
    toast("Just an example. In Lumen, this opens the store.", { id: "demo-link" })
  }

  return (
    <DemoFamilyContext.Provider value={value}>
      <ClaimTransportContext.Provider value={transport}>
        <div className="contents" onClickCapture={stopOutsideLinks} onAuxClickCapture={stopOutsideLinks}>
          {children}
        </div>
      </ClaimTransportContext.Provider>
    </DemoFamilyContext.Provider>
  )
}

export function useDemoFamily(): DemoFamilyValue {
  const value = useContext(DemoFamilyContext)
  if (!value) throw new Error("useDemoFamily needs a <DemoFamily> above it")
  return value
}
