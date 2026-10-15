"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { TheirGiftCard } from "@/components/gifts/their-gift-card"
import { PersonAvatar } from "@/components/shared/person-avatar"
import { StatusChip } from "@/components/shared/status-chip"
import { Card } from "@/components/ui/card"
import { shortName } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useDemoFamily } from "./demo/demo-family"
import { FAMILY_NAME, GIFT, PEOPLE, VIEWER } from "./demo/family"
import { DemoShoppingCard } from "./demo-shopping-card"
import styles from "./marketing.module.css"

type Vars = React.CSSProperties & Record<`--${string}`, string | number>

const DECK = ["tulips", "feeder", "shopping"] as const
type DeckId = (typeof DECK)[number]
type PieceId = DeckId | "family" | "cream"

const DECK_LABEL: Record<DeckId, string> = {
  tulips: "Tulip bulbs",
  feeder: "Bird feeder",
  shopping: "Your shopping",
}

/** Where a deck card sits on a phone, given which one is in front. */
function deckPos(id: DeckId, front: DeckId): "front" | "right" | "left" {
  const offset = (DECK.indexOf(id) - DECK.indexOf(front) + DECK.length) % DECK.length
  return offset === 0 ? "front" : offset === 1 ? "right" : "left"
}

const noop = () => () => {}

/**
 * Room two: the Harper family's cards tossed on the blanket.
 * On a wide screen it is one long collage: a piece straightens, lifts and comes forward under the
 * pointer or on focus, and the whole lot drifts a little with the mouse. On a phone the three main
 * cards are a deck: the front one is live, a tap on a back one pulls it out.
 * Claim the tulips and a row lands in the "You're shopping for" card next to them.
 */
export function Blanket() {
  const { giftsFor, shopping } = useDemoFamily()
  const ref = useRef<HTMLDivElement>(null)
  const frame = useRef(0)
  const [active, setActive] = useState<PieceId | null>(null)
  const [front, setFront] = useState<DeckId>("tulips")
  const [startCount] = useState(shopping.length)
  const [seen, setSeen] = useState(false)
  // Hiding the pieces before they drop is an enhancement: without JS they are simply there.
  const enhanced = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  )

  const nora = giftsFor("nora")
  const tulips = nora.find((g) => g.id === GIFT.tulips)
  const feeder = nora.find((g) => g.id === GIFT.feeder)
  const cream = nora.find((g) => g.id === GIFT.cream)
  const noraName = shortName(PEOPLE.nora.name)
  const people = Object.values(PEOPLE)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true)
          io.disconnect()
        }
      },
      { threshold: 0.12 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  function bring(id: PieceId) {
    setActive(id)
    if ((DECK as readonly string[]).includes(id)) setFront(id as DeckId)
  }

  // A little parallax under a mouse: pieces with more depth drift further. CSS turns it off for reduced motion.
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse") return
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const my = ((e.clientY - rect.top) / rect.height) * 2 - 1
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty("--mx", mx.toFixed(3))
      el.style.setProperty("--my", my.toFixed(3))
    })
  }

  function onPointerLeave(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse") return
    cancelAnimationFrame(frame.current)
    ref.current?.style.setProperty("--mx", "0")
    ref.current?.style.setProperty("--my", "0")
    setActive(null)
  }

  function piece(id: PieceId, vars: Vars, extra?: string) {
    const inDeck = (DECK as readonly string[]).includes(id)
    return {
      className: cn(styles.piece, extra),
      style: vars,
      "data-piece": id,
      "data-active": active === id,
      "data-pos": inDeck ? deckPos(id as DeckId, front) : undefined,
      onPointerDown: () => bring(id),
      onFocusCapture: () => bring(id),
    }
  }

  function cover(id: DeckId) {
    if (deckPos(id, front) === "front") return null
    return <button type="button" className={styles.cover} aria-label={`Bring ${DECK_LABEL[id]} to the front`} onClick={() => bring(id)} />
  }

  const added = shopping.length - startCount

  return (
    <div
      ref={ref}
      data-seen={enhanced ? seen : undefined}
      className={cn(styles.spread, "mx-auto w-full max-w-md lg:max-w-none")}
      role="group"
      aria-label="Examples: the Harper family's gifts. They are made up, and they really work."
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <a
        href="#steps"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:ring-3 focus:ring-ring"
      >
        Skip the examples
      </a>
      {/* The hand-drawn nudge. One sentence, shown wherever the cards are. */}
      <p
        className={cn(
          styles.loose,
          "mb-4 flex items-center justify-center gap-2 font-display text-lg leading-tight font-(weight:--display-weight-soft) lg:mb-0 lg:w-52 lg:flex-col lg:items-start lg:text-xl",
        )}
        style={{ "--r": "-4deg", "--i": 7, "--x": "770px", "--y": "-72px" } as Vars}
      >
        <span>These are real. Go on, tap one.</span>
        <svg viewBox="0 0 70 60" className="h-9 w-10 shrink-0 lg:ml-24 lg:h-11 lg:w-13" fill="none" aria-hidden>
          <path
            className={styles.squiggle}
            d="M8 6c18-4 34 4 30 16-3 9-17 7-14-2 4-11 28-2 26 14-1 8-6 14-12 18m0 0 2-11m-2 11 11-1"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength="300"
          />
        </svg>
      </p>

      <div className={styles.deck}>
        {tulips ? (
          <div
            {...piece("tulips", {
              "--i": 1,
              "--r": "-4deg",
              "--s": 0.96,
              "--d": 10,
              "--x": "214px",
              "--y": "104px",
              "--w": "300px",
              "--z": 3,
            })}
          >
            <span className={styles.tape} aria-hidden />
            <TheirGiftCard gift={tulips} currentUserId={VIEWER.id} ownerName={noraName} />
            {cover("tulips")}
          </div>
        ) : null}

        {feeder ? (
          <div
            {...piece("feeder", {
              "--i": 2,
              "--r": "3.5deg",
              "--s": 0.96,
              "--d": 18,
              "--x": "478px",
              "--y": "8px",
              "--w": "300px",
              "--z": 2,
            })}
          >
            <span className={styles.pin} aria-hidden />
            <TheirGiftCard gift={feeder} currentUserId={VIEWER.id} ownerName={noraName} />
            {cover("feeder")}
          </div>
        ) : null}

        <div
          {...piece("shopping", {
            "--i": 3,
            "--r": "-2.5deg",
            "--s": 0.96,
            "--d": 26,
            "--x": "738px",
            "--y": "96px",
            "--w": "366px",
            "--z": 5,
          })}
        >
          <span className={styles.tape} style={{ "--tape-r": "5deg" } as Vars} aria-hidden />
          <DemoShoppingCard />
          {added > 0 ? (
            <span
              key={shopping.length}
              className={cn(
                styles.badgePop,
                // In the phone deck a back card's corner runs off the side of the screen: the tab's count says it there.
                deckPos("shopping", front) !== "front" && "max-lg:hidden",
                "absolute -top-4 -right-3 z-10 rounded-full border-(length:--ink-width) border-border-strong bg-primary px-3 py-1 font-display text-sm font-(weight:--display-weight) text-primary-foreground shadow-button",
              )}
            >
              +{added} just now
            </span>
          ) : null}
          {cover("shopping")}
        </div>
      </div>

      {/* Phone only: name tabs for the deck, so every card is one obvious tap away. */}
      <div className="relative z-10 mt-9 flex flex-wrap justify-center gap-2 lg:hidden" role="group" aria-label="Cards in the pile">
        {DECK.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={front === id}
            onClick={() => bring(id)}
            className={cn(
              "inline-flex min-h-11 items-center gap-1.5 rounded-full border-(length:--ink-width) border-border-strong px-4 text-sm font-(weight:--label-weight) transition-colors focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none",
              front === id ? "bg-foreground text-background" : "bg-card text-foreground shadow-button",
            )}
          >
            {DECK_LABEL[id]}
            {id === "shopping" ? (
              <span
                key={shopping.length}
                className={cn(
                  added > 0 && styles.badgePop,
                  "inline-flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground",
                )}
              >
                {shopping.length}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div
        {...piece(
          "family",
          {
            "--i": 0,
            "--r": "-6deg",
            "--s": 1,
            "--d": 6,
            "--x": "-6px",
            "--y": "-14px",
            "--w": "228px",
            "--z": 4,
          },
          "hidden lg:block",
        )}
      >
        <span className={styles.pin} aria-hidden />
        <Card variant="ink" className="gap-0 bg-card p-4">
          <div className="flex items-center -space-x-2">
            {people.slice(0, 5).map((p) => (
              <PersonAvatar key={p.id} id={p.id} name={p.name} size="md" className="ring-[3px] ring-card" />
            ))}
            <span className="relative grid size-10 place-items-center rounded-full bg-muted text-sm font-bold ring-[3px] ring-card">+1</span>
          </div>
          <p className="mt-3 font-display text-2xl leading-tight font-(weight:--display-weight) tracking-(--display-tracking)">{FAMILY_NAME}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{people.length} people sharing lists</p>
        </Card>
      </div>

      {/* This one hangs off the end of the blanket, into the next room. */}
      {cream ? (
        <div
          {...piece(
            "cream",
            {
              "--i": 4,
              "--r": "5deg",
              "--s": 0.9,
              "--d": 14,
              "--x": "-14px",
              "--y": "392px",
              "--w": "270px",
              "--z": 1,
            },
            "hidden lg:block",
          )}
        >
          {/* A taken card is see-through in the app; on the blanket it needs paper behind it. */}
          <div className="rounded-xl bg-card">
            <TheirGiftCard gift={cream} currentUserId={VIEWER.id} ownerName={noraName} />
          </div>
        </div>
      ) : null}

      {/* Loose status stickers: the app's own chips, tossed on the blanket. Decoration only. */}
      <div aria-hidden className="hidden lg:block">
        <span className={cn(styles.loose, "block")} style={{ "--r": "9deg", "--i": 5, "--x": "318px", "--y": "44px" } as Vars}>
          <StatusChip state="available" className="h-9 px-4 text-sm shadow-button" />
        </span>
        <span className={cn(styles.loose, "block")} style={{ "--r": "-7deg", "--i": 6, "--x": "548px", "--y": "500px" } as Vars}>
          <StatusChip state="mine" className="h-9 px-4 text-sm shadow-button" />
        </span>
        <span
          className={cn(styles.loose, "block")}
          style={
            {
              "--r": "-10deg",
              "--i": 8,
              "--x": "268px",
              "--y": "512px",
            } as Vars
          }
        >
          <StatusChip state="taken" className="h-9 px-4 text-sm shadow-button" />
        </span>
      </div>
    </div>
  )
}
