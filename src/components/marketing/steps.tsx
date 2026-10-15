"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { giftState } from "@/components/gifts/their-gift-card"
import { StatusChip } from "@/components/shared/status-chip"
import { cn } from "@/lib/utils"
import { useDemoFamily } from "./demo/demo-family"
import { DESKTOP } from "./desktop"
import { GIFT, VIEWER } from "./demo/family"
import styles from "./marketing.module.css"
import { StepPhone, type Seat } from "./step-phone"

function useDesktop() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(DESKTOP)
      mq.addEventListener("change", onChange)
      return () => mq.removeEventListener("change", onChange)
    },
    () => window.matchMedia(DESKTOP).matches,
    () => false,
  )
}

const noop = () => () => {}

const display = "font-display font-(weight:--display-weight) tracking-(--display-tracking)"
const body = "mt-4 max-w-[32ch] text-lg leading-relaxed text-foreground/85 lg:mt-5 lg:text-[1.35rem] lg:leading-[1.6]"

/** Whose phone each step is acted out on. */
const SEATS: Seat[] = ["nora", "you", "you", "nora"]

type Stage = { active: number; seat: Seat; turns: number }

const STEPS: { title: string; text: React.ReactNode }[] = [
  {
    title: "Make your list.",
    text: (
      <>
        Add a few things you&apos;d love. Paste a link from a store, and for many stores Lumen fills in the name and picture. This one is Nora&apos;s.
      </>
    ),
  },
  {
    title: "Peek at everyone else's.",
    text: (
      <>
        Your family can see your list, and you can see theirs. Here is Nora&apos;s on your phone. Anything marked{" "}
        <StatusChip state="available" className="align-middle" />{" "}is yours to pick.
      </>
    ),
  },
  {
    title: "Call dibs.",
    text: <>Tap “I&apos;ll get this” on the robe. Now the rest of the family can see it&apos;s taken, so nobody buys two.</>,
  },
  {
    title: "It stays a surprise.",
    text: <>Now look at Nora&apos;s phone again. Her list is just as she left it. No names. No hints. Not even a wink.</>,
  },
]

/**
 * Step 3's last line changes once the reader has tapped the real button. Only the result is in the
 * live region. The invitation is true only where the button works, so it keeps its place but
 * stays unseen until the page is live.
 */
function DibsLine({ claimed, live }: { claimed: boolean; live: boolean }) {
  return (
    <div className="mt-4 max-w-[34ch]">
      {claimed ? null : (
        <p className={cn("inline-block rounded-xl border-2 border-dashed border-foreground/40 px-4 py-3 text-lg leading-snug font-semibold", !live && "invisible")}>
          Your turn. The button on the phone really works.
        </p>
      )}
      <div aria-live="polite">
        {claimed ? (
          <p className="ink-card rounded-xl bg-card p-4 text-base leading-relaxed">
            <strong className="block font-display text-lg font-(weight:--display-weight)">That&apos;s all there is to it.</strong>
            <span className="mt-1.5 flex flex-wrap items-center gap-2">
              Dan and Maya now see <StatusChip state="taken" />
            </span>
            <span className="mt-1 block text-muted-foreground">And Nora? Keep going.</span>
          </p>
        ) : null}
      </div>
    </div>
  )
}

/**
 * Room three: four steps, acted out on one phone. The step crossing the reading line decides what
 * the phone shows; going from step 3 to step 4 it flips over to Nora's side. On a wide screen the
 * phone sticks beside the words; on a phone it sticks to the top and the words scroll under it.
 * Without JavaScript every step's words are there at full strength and the phone shows step 1.
 */
export function Steps({ intro }: { intro: React.ReactNode }) {
  const desktop = useDesktop()
  const [stage, setStage] = useState<Stage>({ active: 0, seat: "nora", turns: 0 })
  const stepRefs = useRef<(HTMLElement | null)[]>([])
  // Dimming the steps that are not current is an enhancement: without JS none of them is dimmed.
  // The two lines that point at working buttons wait for it too.
  const enhanced = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  )

  const { giftsFor } = useDemoFamily()
  const robe = giftsFor("nora").find((g) => g.id === GIFT.robe)
  const open = robe ? giftState(robe, VIEWER.id) === "available" : false

  useEffect(() => {
    const line = desktop ? 50 : 70
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          const active = Number((e.target as HTMLElement).dataset.index)
          setStage((s) => {
            if (s.active === active) return s
            const seat = SEATS[active]
            return { active, seat, turns: s.turns + (seat === s.seat ? 0 : 1) }
          })
        }
      },
      { rootMargin: `-${line}% 0px -${100 - line}% 0px`, threshold: 0 },
    )
    stepRefs.current.forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [desktop])

  const sit = (seat: Seat) => setStage((s) => (s.seat === seat ? s : { ...s, seat, turns: s.turns + 1 }))

  const { active, seat, turns } = stage

  return (
    <div className={styles.steps}>
      <div className={styles.grid}>
        <div className={styles.intro}>{intro}</div>
        <div className={styles.stage}>
          <StepPhone
            seat={seat}
            turns={turns}
            // Up close whenever your side is there to be tapped. Step 2 stays far: it is about seeing the whole list.
            zoom={active >= 2 && seat === "you" ? "near" : "far"}
            focus={active >= 2}
            nudge={active === 2 && open}
            stamp={active === 3 && seat === "nora"}
            onSit={active === 3 ? sit : undefined}
          />
        </div>

        {/* The list's own box is taken out of the layout, so each step is a row of the grid above. */}
        <ol role="list" className="contents">
          {STEPS.map((s, i) => (
            <li
              key={s.title}
              ref={(el) => {
                stepRefs.current[i] = el
              }}
              data-index={i}
              data-current={enhanced ? i === active : undefined}
              className={styles.step}
              style={{ "--row": i + 2 } as React.CSSProperties}
            >
              <p className="flex items-center gap-3">
                <span
                  className={cn(
                    "inline-flex h-9 -rotate-2 items-center rounded-full border-(length:--ink-width) border-border-strong px-4 font-display text-base font-(weight:--display-weight) shadow-button",
                    i === active ? "bg-hero text-foreground" : "bg-card text-foreground",
                  )}
                >
                  Step {i + 1}
                </span>
                <span className="text-sm font-semibold text-muted-foreground">of 4</span>
              </p>
              <h3 className={cn(display, "mt-4 max-w-[13ch] text-4xl leading-[1.04] text-balance sm:text-5xl lg:text-6xl")}>{s.title}</h3>
              <p className={body}>{s.text}</p>
              {i === 2 ? <DibsLine claimed={!open} live={enhanced} /> : null}
              {i === 3 ? (
                <p
                  className={cn(
                    "mt-4 max-w-[34ch] rounded-xl border-2 border-dashed border-foreground/40 px-4 py-3 text-lg leading-snug font-semibold",
                    !enhanced && "invisible",
                  )}
                >
                  Don&apos;t take our word for it. Flip the phone with the{" "}
                  <span className="whitespace-nowrap">“You see”</span> and <span className="whitespace-nowrap">“Nora sees”</span>{" "}buttons.
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
      {/* Where "Skip the phone" lands. */}
      <div id="after-steps" />
    </div>
  )
}
