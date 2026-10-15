"use client"

import { useEffect, useRef, useState } from "react"
import { MemberListHeader } from "@/components/gifts/member-list-header"
import { MyListHeader } from "@/components/gifts/my-list-header"
import { OwnGiftCard } from "@/components/gifts/own-gift-card"
import { TheirGiftList } from "@/components/gifts/their-gift-list"
import { BrandMark } from "@/components/shared/brand"
import { PersonAvatar } from "@/components/shared/person-avatar"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { shortName } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useDemoFamily } from "./demo/demo-family"
import { PEOPLE, VIEWER, type DemoPerson } from "./demo/family"
import { DESKTOP } from "./desktop"
import styles from "./marketing.module.css"

export type Seat = "you" | "nora"

const SLICES = [-5, -2.5, 0, 2.5, 5]

/** Small screens: how far above the window's bottom fade the step's button must end, in window pixels. */
const CLEAR = 6

/** How far down `el` starts inside `within`, by layout alone: the flip and the zoom (transforms) don't count. */
function topWithin(el: HTMLElement, within: HTMLElement): number | null {
  let y = 0
  for (let node: HTMLElement | null = el; node && node !== within; ) {
    const parent = node.offsetParent as HTMLElement | null
    if (!parent || !within.contains(parent)) return null
    y += node.offsetTop + (parent === within ? 0 : parent.clientTop)
    node = parent
  }
  return y
}

const seatButton =
  "h-11 min-h-11 flex-1 gap-2 rounded-lg px-3 text-base font-(weight:--label-weight) aria-pressed:bg-foreground aria-pressed:text-background aria-pressed:hover:bg-foreground aria-pressed:hover:text-background"

/** A tiny copy of the app's header bar, with whoever holds the phone at the right. */
function AppBar({ person }: { person: DemoPerson }) {
  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card px-3">
      <span className="flex items-center gap-2">
        <BrandMark size={28} />
        <span className="font-display text-lg font-(weight:--display-weight) tracking-(--display-tracking)">Lumen</span>
      </span>
      <PersonAvatar id={person.id} name={person.name} size="sm" />
    </div>
  )
}

function Face({ back, hidden, owner, bezel, children }: { back?: boolean; hidden: boolean; owner: string; bezel: string; children: React.ReactNode }) {
  return (
    <div
      inert={hidden}
      data-hidden={hidden}
      data-face={back ? "you" : "nora"}
      className={cn(styles.face, back && styles.back, "flex flex-col border-(length:--ink-width) border-border-strong p-2.5 pt-0", bezel)}
    >
      {/* Part of the drawing. The caption above the phone already says whose it is, so this is not read out twice. */}
      <p aria-hidden className="flex h-8 shrink-0 items-center justify-center gap-2 text-xs font-(weight:--label-weight)">
        <span className="h-1.5 w-8 rounded-full bg-current opacity-30" />
        {owner}
        <span className="h-1.5 w-8 rounded-full bg-current opacity-30" />
      </p>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.7rem] border-(length:--ink-width) border-border-strong bg-background text-foreground">
        {children}
      </div>
    </div>
  )
}

/**
 * The phone and what sits around it. One side is Nora's phone: her own "My list", built only from
 * `ownGifts`, which carries no claim data at all, so nothing a visitor claims can ever show there.
 * The other is yours: the app's real "Nora's list" screen, live. `turns` counts half turns, so it
 * always turns the same way round, like a real phone in your hand. Nora's side shows on even turns.
 */
export function StepPhone({
  seat,
  turns,
  zoom = "far",
  focus = false,
  nudge = false,
  stamp = false,
  onSit,
}: {
  seat: Seat
  turns: number
  /** Small screens only: "near" moves the camera in, so the buttons are big enough to tap. */
  zoom?: "far" | "near"
  /**
   * Your side scrolls to the first gift (and back to the top when this goes false). Up close on a
   * small screen it goes further if it has to, so the gift's button ends clear of the window's fade.
   */
  focus?: boolean
  nudge?: boolean
  stamp?: boolean
  /** When set, the caption becomes the "You see / Nora sees" switch. */
  onSit?: (seat: Seat) => void
}) {
  const { ownGifts, giftsFor } = useDemoFamily()
  // Nora's side reads `hers` and nothing else. `noras` (claims included) is for your side only.
  const hers = ownGifts("nora")
  const noras = giftsFor("nora")
  const noraName = shortName(PEOPLE.nora.name)
  const [engaged, setEngaged] = useState(false)
  const screenRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<HTMLDivElement>(null)
  const holder = seat === "nora" ? PEOPLE.nora : VIEWER

  useEffect(() => {
    const screen = screenRef.current
    const view = viewRef.current
    if (!screen || !view) return

    function place(smooth: boolean) {
      if (!screen || !view) return
      const gift = focus ? screen.querySelector<HTMLElement>("ul.grid > li") : null
      let top = gift ? gift.offsetTop - 10 : 0
      // Up close on a small screen the window is short and the screen can't be scrolled by hand:
      // the button matters more than the top of the card, so it is what gets placed.
      const button = gift?.querySelector<HTMLElement>("[data-claim-state] > button")
      const scaler = view.firstElementChild as HTMLElement | null
      if (button && scaler && zoom === "near" && !window.matchMedia(DESKTOP).matches) {
        const scale = parseFloat(getComputedStyle(view).getPropertyValue("--near")) || 1
        const fade = parseFloat(getComputedStyle(view, "::after").height) || 0
        const screenTop = topWithin(screen, scaler)
        const buttonTop = topWithin(button, screen)
        if (screenTop !== null && buttonTop !== null) {
          // Everything in the phone's own pixels: where the window ends, less the fade, seen from the screen's top.
          const lowest = (view.clientHeight - scaler.offsetTop - fade - CLEAR) / scale - screenTop
          top = Math.max(top, buttonTop + button.offsetHeight - lowest)
        }
      }
      screen.scrollTo({ top, behavior: smooth ? "smooth" : "auto" })
    }

    place(!window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    // The window's height follows the browser's (a turned phone, a resized window).
    let first = true
    const ro = new ResizeObserver(() => {
      if (first) first = false
      else place(false)
    })
    ro.observe(view)
    return () => ro.disconnect()
  }, [focus, zoom])

  return (
    <div className="relative mx-auto max-w-[23.5rem]" role="group" aria-label="Example: Nora's list, on a phone">
      <a
        href="#after-steps"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:ring-3 focus:ring-ring"
      >
        Skip the phone
      </a>
      <div className={styles.cap}>
        {onSit ? (
          <ToggleGroup
            value={[seat]}
            onValueChange={(v) => {
              if (v[0]) onSit(v[0] as Seat)
            }}
            aria-label="Whose phone are you looking at?"
            spacing={1}
            className="ink-card w-full max-w-[22rem] rounded-xl bg-card p-1"
          >
            <ToggleGroupItem value="you" className={seatButton}>
              <PersonAvatar id={VIEWER.id} name={VIEWER.name} size="sm" className="size-7 shrink-0" />
              You see
            </ToggleGroupItem>
            <ToggleGroupItem value="nora" className={seatButton}>
              <PersonAvatar id={PEOPLE.nora.id} name={PEOPLE.nora.name} size="sm" className="size-7 shrink-0" />
              Nora sees
            </ToggleGroupItem>
          </ToggleGroup>
        ) : null}
        {/* One live region that stays put, so a flip is read out. The pill inside is new each time, which is what makes it pop. */}
        <div aria-live="polite" className={onSit ? "sr-only" : undefined}>
          <p
            key={seat}
            className="flex animate-in items-center gap-2 rounded-full border-(length:--ink-width) border-border-strong bg-card py-1 pr-4 pl-1 font-display text-base leading-none font-(weight:--display-weight) shadow-button duration-300 fade-in zoom-in-90 motion-reduce:animate-none"
          >
            <span aria-hidden className="contents">
              <PersonAvatar id={holder.id} name={holder.name} size="sm" />
            </span>
            {seat === "nora" ? "Nora's phone" : "Your phone"}
          </p>
        </div>
      </div>

      <div ref={viewRef} className={styles.view} data-zoom={zoom}>
        <div className={styles.scaler}>
          <div className={styles.persp}>
            <div
              data-engaged={engaged}
              data-hop={turns === 0 ? undefined : turns % 2 ? "a" : "b"}
              onPointerEnter={(e) => e.pointerType === "mouse" && setEngaged(true)}
              onPointerLeave={(e) => e.pointerType === "mouse" && setEngaged(false)}
              onFocusCapture={() => setEngaged(true)}
              onBlurCapture={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) setEngaged(false)
              }}
              className={styles.tilt}
            >
              <div className={styles.shadow} aria-hidden />
              <div className={styles.flipper} style={{ transform: `rotateY(${turns * 180}deg)` }}>
                {SLICES.map((z) => (
                  <div key={z} aria-hidden className={styles.slab} style={{ "--z": `${z}px` } as React.CSSProperties} />
                ))}

                <Face hidden={seat !== "nora"} owner="Nora's phone" bezel="bg-primary text-primary-foreground">
                  <AppBar person={PEOPLE.nora} />
                  <div role="group" aria-label="Nora's own list, as she sees it" className={cn(styles.screen, "min-h-0 flex-1 px-3.5 pt-4 pb-6")}>
                    {/* The list below is inert, so this says what is on it. It is built from her own list alone and never changes with a claim. */}
                    <p className="sr-only">
                      {hers.length} {hers.length === 1 ? "gift" : "gifts"} on her list. No names, no claims, nothing about who is getting what.
                    </p>
                    {/* Her buttons would add, edit and remove for real, so this side is for looking only. */}
                    <div inert className="flex flex-col gap-4">
                      <MyListHeader count={hers.length} addHref="/signup" headingLevel="p" />
                      <ul className="grid grid-cols-1 gap-4 pr-1 pb-1">
                        {hers.map((gift) => (
                          <OwnGiftCard key={gift.id} gift={gift} />
                        ))}
                      </ul>
                    </div>
                  </div>
                </Face>

                <Face back hidden={seat !== "you"} owner="Your phone" bezel="bg-card text-card-foreground">
                  <AppBar person={VIEWER} />
                  <div ref={screenRef} data-nudge={nudge} className={cn(styles.screen, "min-h-0 flex-1 px-3.5 pt-4 pb-6")}>
                    <MemberListHeader
                      id={PEOPLE.nora.id}
                      name={PEOPLE.nora.name}
                      shortName={noraName}
                      giftCount={noras.length}
                      openCount={noras.filter((g) => !g.gift_claims).length}
                      headingLevel="p"
                    />
                    <TheirGiftList gifts={noras} currentUserId={VIEWER.id} ownerName={noraName} columns="one" />
                  </div>
                </Face>
              </div>
            </div>
          </div>
        </div>
      </div>

      {stamp ? (
        <p
          className={cn(
            styles.stamp,
            "ink-card rounded-xl bg-primary px-4 py-2.5 text-center font-display text-lg leading-tight font-(weight:--display-weight) text-primary-foreground",
          )}
        >
          Same list as step 1.
          <span className="block font-sans text-sm font-semibold">No names. No hints.</span>
        </p>
      ) : null}
    </div>
  )
}
