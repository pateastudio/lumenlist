"use client"

import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { usePathname, useRouter } from "next/navigation"
import { ArrowRight, Footprints, Lock, PartyPopper } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Tour, TourArrow, TourNext, TourPortal, TourSkip, TourSpotlight, TourSpotlightRing, TourStep } from "@/components/ui/tour"
import { cn } from "@/lib/utils"
import type { TourData } from "@/types/tour"
import { findAnchor } from "../anchors"
import { countWord } from "../tour-state"
import { useLocal } from "../tour-local"
import { buildSteps, STEP_COUNT, type WalkStep } from "./stops"

// The walk: a welcome that offers it, then four coach marks on the real screens (Dice UI's Base UI
// Tour, src/components/ui/tour.tsx), then a card that hands over to First Steps.
//
// The library knows one page. This file adds the walk between pages: the step number lives in this
// tab's sessionStorage (useLocal), each step names its page and its anchor, and the controller goes
// there, waits for the anchor, scrolls it clear of the header and the phone tab bar, and only then
// shows the card. One <TourStep> is mounted at a time (keyed by step), because the library
// re-registers a step when its target or side changes and loses its place among several.

export type WalkProps = {
  data: TourData
  replay: boolean
  /** How many checklist steps are still to do. Zero: the walk ends on "You know everything". */
  left: number
  /** Finds the First Steps pill, for the hand-off card to point at. Stable between renders. */
  findPill: () => HTMLElement | null
  /**
   * "Not now", Skip or Escape. `heading` is the page the walk had already asked for when they
   * skipped between two stops (it still arrives), or null when they are staying where they are.
   */
  onSkip: (heading: string | null) => void
  /** The hand-off's primary button, or a tap on the pill. */
  onShowSteps: () => void
  /** "Later", or Escape on the hand-off. */
  onLater: () => void
  /** "Done" when nothing is left on the checklist. */
  onAllDone: () => void
}

/** True while the hand-off card is up, so the pill (and only the pill) can be shown under it. */
export function useWalkAtHandoff(userId: string): boolean {
  return useLocal(userId, "walk-step", "session")[0] === "finish"
}

const HEADER = 64
/** Space the card needs beside its target, used to decide whether to scroll. */
const CARD_ROOM = 300
const SPOTLIGHT_PADDING = 6
/** How long a stop's target gets to turn up on its page before the walk carries on without it. */
const ANCHOR_WAIT = 4000
/** How long the First Steps pill gets to be drawn before the walk ends without its hand-off card. */
const PILL_WAIT = 200
/** One dim for the spotlight and for the "one sec" state between pages, so the two read as one. */
const DIM = "color-mix(in oklab, var(--foreground) 62%, transparent)"

const display = "font-display font-(weight:--display-weight) tracking-(--display-tracking)"

const never = () => () => {}

type View = {
  step: number
  pathname: string
  el: HTMLElement
  side: "top" | "bottom"
  /** Corner radius of the cut-out, from the target's own. */
  radius: number
  /** Height of whatever is fixed to the bottom of the screen (the phone tab bar), to keep clear of. */
  bottomBar: number
}

/** Calls back with the anchor as soon as it is on the page, or with null when time runs out. */
function waitForAnchor(find: () => HTMLElement | null, ms: number, done: (el: HTMLElement | null) => void) {
  let over = false
  const observer = new MutationObserver(check)
  const timer = window.setTimeout(() => end(null), ms)
  const frame = requestAnimationFrame(check)
  function end(el: HTMLElement | null) {
    if (over) return
    stop()
    done(el)
  }
  function check() {
    if (over) return
    const el = find()
    if (el) end(el)
  }
  function stop() {
    over = true
    observer.disconnect()
    window.clearTimeout(timer)
    cancelAnimationFrame(frame)
  }
  observer.observe(document.body, { childList: true, subtree: true, attributes: true })
  return stop
}

/** True for things that don't scroll with the page: the header tabs, the phone tab bar. */
function isPinned(el: HTMLElement) {
  for (let node: HTMLElement | null = el; node && node !== document.body; node = node.parentElement) {
    const position = getComputedStyle(node).position
    if (position === "fixed" || position === "sticky") return true
  }
  return false
}

/** Height of the phone tab bar, or 0 when the tabs are in the header. */
function bottomBarHeight() {
  const tab = findAnchor("tab-home")
  if (!tab) return 0
  const top = tab.getBoundingClientRect().top
  return top > window.innerHeight / 2 ? window.innerHeight - top : 0
}

/** Scrolls the target to where it and its card both fit between the header and the tab bar. */
function bringIntoView(el: HTMLElement) {
  if (isPinned(el)) return
  const box = el.getBoundingClientRect()
  const top = HEADER + 20
  const bottom = window.innerHeight - bottomBarHeight() - 12
  // The card reads best under its target, with what the target belongs to still showing above.
  if (box.top >= top && box.bottom + CARD_ROOM <= bottom) return
  // Centre the pair (target, then card) in the free space, so some context shows above the target.
  const lead = Math.max(20, (bottom - HEADER - box.height - CARD_ROOM) / 2)
  window.scrollTo({ top: Math.max(0, window.scrollY + box.top - HEADER - lead), behavior: "instant" })
}

function measure(step: number, pathname: string, el: HTMLElement): View {
  const box = el.getBoundingClientRect()
  const bottomBar = bottomBarHeight()
  const free = window.innerHeight - bottomBar
  const own = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0
  return {
    step,
    pathname,
    el,
    side: box.top + box.height / 2 > HEADER + (free - HEADER) * 0.6 ? "top" : "bottom",
    radius: Math.min(Math.max(own, 8) + SPOTLIGHT_PADDING, box.height / 2 + SPOTLIGHT_PADDING),
    bottomBar,
  }
}

/**
 * Safari moves between buttons with Option+Tab (plain Tab skips them unless a setting is changed),
 * and the tour library's focus trap looks at plain Tab only. Without this, Option+Tab on the last
 * button leaves for the browser's own toolbar instead of coming round to the first.
 */
function wrapOptionTab(event: React.KeyboardEvent<HTMLElement>) {
  if (event.key !== "Tab" || !event.altKey) return
  const buttons = [...event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled)")]
  const [from, to] = event.shiftKey ? [buttons[0], buttons[buttons.length - 1]] : [buttons[buttons.length - 1], buttons[0]]
  if (!from || document.activeElement !== from) return
  event.preventDefault()
  to.focus({ preventScroll: true })
}

export function Walk({ data, replay, left, findPill, onSkip, onShowSteps, onLater, onAllDone }: WalkProps) {
  const pathname = usePathname()
  const router = useRouter()
  // False on the server and for the first pass in the browser, when what this tab remembers can't
  // be read yet. Nothing is drawn or decided until it can.
  const ready = useSyncExternalStore(never, () => true, () => false)
  // Which stop they are on survives a reload in this tab. Not worth a database write.
  const [memory, setMemory] = useLocal(data.userId, "walk-step", "session")
  const [missedRaw, setMissed] = useLocal(data.userId, "walk-missed", "session")
  const steps = useMemo(() => buildSteps(data), [data])

  const n = memory && /^[1-4]$/.test(memory) ? Number(memory) : 0
  const stage = memory === "finish" ? "finish" : n ? "step" : "welcome"
  /** The card after the last stop, pointing at the First Steps pill. None when nothing is left to do. */
  const handoff = useMemo(
    () =>
      left > 0
        ? {
            find: findPill,
            kicker: "That's the look around",
            title: "Now, your first steps",
            body:
              left === 1
                ? "One small first step is waiting for you right here. Do it whenever you like."
                : `${countWord(left)} small first steps are waiting for you right here. Do them whenever you like.`,
            note: "Want the tour again? Tap your picture at the top, then Account.",
            primary: "Show my first steps",
            later: "Later",
          }
        : null,
    [left, findPill],
  )
  const handing = stage === "finish" && handoff !== null
  const findNext = handoff?.find
  const handoffStep = useMemo<WalkStep | null>(
    () => (handing && findNext ? { id: "handoff", path: pathname, href: pathname, find: findNext, title: "", body: () => "", clickable: true, next: "" } : null),
    [handing, findNext, pathname],
  )
  /** Where the walk is: 1 to 4 for a stop, 5 for the hand-off card, 0 when no card is due. */
  const at = stage === "step" ? n : handing ? STEP_COUNT + 1 : 0
  const step = stage === "step" ? steps[n - 1] : handoffStep
  /** Stops that weren't on the page for this person, so the count on the cards stays honest. */
  const missed = useMemo(() => (missedRaw ? missedRaw.split(",").map(Number).filter(Boolean) : []), [missedRaw])

  const [view, setView] = useState<View | null>(null)
  const [resized, setResized] = useState(0)
  const direction = useRef(1)
  const pushed = useRef<string | null>(null)
  const keepFocus = useRef(false)
  const nextButton = useRef<HTMLButtonElement | null>(null)
  const startButton = useRef<HTMLButtonElement | null>(null)
  const finishButton = useRef<HTMLButtonElement | null>(null)
  const titleId = useId()
  const bodyId = useId()

  const showSteps = useCallback(() => {
    setMemory(null)
    setMissed(null)
    onShowSteps()
  }, [setMemory, setMissed, onShowSteps])
  const later = useCallback(() => {
    setMemory(null)
    setMissed(null)
    onLater()
  }, [setMemory, setMissed, onLater])

  const latest = useRef({ handoff, onShowSteps: showSteps, onLater: later })
  useEffect(() => {
    latest.current = { handoff, onShowSteps: showSteps, onLater: later }
  })

  // Replay: they asked for it, so straight to stop one. Once, when the walk mounts with nothing remembered.
  const started = useRef(false)
  useEffect(() => {
    if (!ready || started.current) return
    started.current = true
    if (replay && memory === null) setMemory("1")
  }, [ready, replay, memory, setMemory])

  const go = useCallback(
    (to: number) => {
      if (to > STEP_COUNT) {
        keepFocus.current = true
        // With a hand-off card to come, the last stop stays up until that card takes over.
        if (!latest.current.handoff) setView(null)
        setMemory("finish")
      } else {
        keepFocus.current = false
        setMemory(String(Math.max(1, to)))
      }
    },
    [setMemory],
  )
  const forward = useCallback(() => {
    direction.current = 1
    go(n + 1)
  }, [go, n])
  const back = useCallback(() => {
    direction.current = -1
    go(n - 1)
  }, [go, n])

  const skipTour = useCallback(() => {
    setView(null)
    setMemory(null)
    setMissed(null)
    onSkip(step && step.path !== pathname ? step.path : null)
    toast(left > 0 ? "No problem. Your first steps are down here whenever you like." : "No problem. The tour is under Account whenever you want it.")
  }, [setMemory, setMissed, onSkip, step, pathname, left])

  function allDone() {
    setMemory(null)
    setMissed(null)
    onAllDone()
  }

  // The walk: get to the step's page, wait for its anchor, bring it into view, then show the card.
  useEffect(() => {
    if (!step) {
      pushed.current = null
      return
    }
    const missing = () => {
      // Nothing to hand over to after all (no pill on this page): end the walk without the card.
      if (at > STEP_COUNT) return latest.current.onLater()
      // Not on the page for this person: carry on in the direction they were going.
      if (!missed.includes(n)) setMissed([...missed, n].join(","))
      if (n + direction.current < 1) direction.current = 1
      go(n + direction.current)
    }
    if (pathname !== step.path) {
      const key = `${n}:${step.href}`
      const push = () => {
        if (pushed.current === key) return
        pushed.current = key
        router.push(step.href)
      }
      push()
      // A page that never arrives (it redirected, say) must not leave them staring at "one sec".
      const timer = window.setTimeout(missing, 8000)
      return () => window.clearTimeout(timer)
    }
    pushed.current = null
    let live = true
    let frame = 0
    // The pill is drawn as the hand-off comes up, which can be a moment after the first look. If it
    // still isn't there after a short grace there is none on this page, so end then rather than
    // hold the last stop for four seconds.
    const wait = at > STEP_COUNT ? PILL_WAIT : ANCHOR_WAIT
    const stop = waitForAnchor(step.find, wait, (el) => {
      if (!live) return
      if (!el) return missing()
      bringIntoView(el)
      // Two frames for the scroll and any late layout to land before measuring.
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          if (!live) return
          setView(measure(at, pathname, el))
          if (missed.includes(at)) setMissed(missed.filter((m) => m !== at).join(",") || null)
        })
      })
    })
    return () => {
      live = false
      stop()
      cancelAnimationFrame(frame)
    }
  }, [step, n, at, pathname, resized, router, go, missed, setMissed])

  const shown = at > 0 && step && view && view.pathname === pathname && step.path === pathname ? view : null
  const shownHandoff = shown && shown.step > STEP_COUNT ? handoff : null
  const shownStep = shown ? (shown.step > STEP_COUNT ? handoffStep : steps[shown.step - 1]) : null
  /** The old card stays up for the instant it takes to find the next anchor on the same page. */
  const busy = shown ? shown.step !== at : false
  /** Counting only the stops this person really gets. */
  const stepTotal = STEP_COUNT - missed.length
  const stepAt = shown ? Math.min(stepTotal, shown.step - missed.filter((m) => m < shown.step).length) : 0

  // Escape skips, also in the moment between pages when no card is up to catch it.
  useEffect(() => {
    if (at === 0) return
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return
      if (at > STEP_COUNT) latest.current.onLater()
      else skipTour()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [at, skipTour])

  // A turned phone or a resized window can swap the header tabs for the tab bar: look again.
  useEffect(() => {
    if (at === 0) return
    let timer = 0
    function onResize() {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setResized((v) => v + 1), 150)
    }
    window.addEventListener("resize", onResize)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener("resize", onResize)
    }
  }, [at])

  // The library redraws the cut-out on scroll and resize only. Pictures that load late can nudge
  // the target, so tell it when the target has moved.
  useEffect(() => {
    if (!shown) return
    let last = ""
    const timer = window.setInterval(() => {
      const box = shown.el.getBoundingClientRect()
      const now = `${box.left},${box.top},${box.width},${box.height}`
      if (last && now !== last) window.dispatchEvent(new Event("scroll"))
      last = now
    }, 300)
    return () => window.clearInterval(timer)
  }, [shown])

  // Where tapping the highlighted thing is the natural move (the tab), it moves the walk on.
  useEffect(() => {
    if (!shown || !shownStep?.clickable || busy) return
    const el = shown.el
    function onClick(event: MouseEvent) {
      event.preventDefault()
      event.stopPropagation()
      if (shown && shown.step > STEP_COUNT) latest.current.onShowSteps()
      else forward()
    }
    el.addEventListener("click", onClick, true)
    return () => el.removeEventListener("click", onClick, true)
  }, [shown, shownStep, busy, forward])

  if (!ready) return null

  if (stage === "welcome") {
    const family = data.firstFamily?.name
    return (
      <Dialog open disablePointerDismissal onOpenChange={(open) => !open && skipTour()}>
        <DialogContent
          showCloseButton={false}
          initialFocus={startButton}
          data-walk="welcome"
          className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-2xl border-(length:--ink-width) border-border-strong bg-card p-0 text-base text-card-foreground shadow-card ring-0 sm:max-w-md motion-reduce:data-open:animate-none"
        >
          <div className="border-b-(length:--ink-width) border-border-strong bg-hero px-6 pt-7 pb-6 text-foreground">
            <span aria-hidden className="text-4xl leading-none">👋</span>
            <DialogTitle className={cn(display, "mt-3 text-3xl leading-[1.1] text-balance")}>Welcome to Lumen, {data.firstName}.</DialogTitle>
          </div>
          <div className="flex flex-col gap-5 p-6">
            <DialogDescription className="text-base text-card-foreground">
              {family ? `You're in ${family}. ` : ""}
              Lumen is where families share gift lists, so everyone gets something they&apos;d love and nobody buys the same thing twice.
            </DialogDescription>
            <p className="text-base font-semibold">Want a quick look around? Four stops, under a minute. Then your first steps, in your own time.</p>
            <div className="flex flex-col gap-2">
              <Button ref={startButton} variant="ink" size="lg" className="w-full" onClick={() => go(1)}>
                Show me around <ArrowRight aria-hidden />
              </Button>
              <Button variant="ghost" size="lg" className="w-full text-muted-foreground" onClick={skipTour}>
                Not now
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (stage === "finish" && !handing) {
    return (
      <Dialog open disablePointerDismissal onOpenChange={(open) => !open && allDone()}>
        <DialogContent
          showCloseButton={false}
          initialFocus={finishButton}
          data-walk="finish"
          className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-2xl border-(length:--ink-width) border-border-strong bg-card p-0 text-base text-card-foreground shadow-card ring-0 sm:max-w-md motion-reduce:data-open:animate-none"
        >
          <div className="border-b-(length:--ink-width) border-border-strong bg-hero px-6 pt-7 pb-6 text-foreground">
            <PartyPopper aria-hidden className="size-9" strokeWidth={2.25} />
            <DialogTitle className={cn(display, "mt-3 text-3xl leading-[1.1] text-balance")}>That&apos;s it. You know everything.</DialogTitle>
          </div>
          <div className="flex flex-col gap-5 p-6">
            <DialogDescription className="text-base text-card-foreground">
              Your first steps are all done too, so there&apos;s nothing left to tick off. Add things you&apos;d love, pick from other lists, and let Lumen keep the secrets.
            </DialogDescription>
            <Button ref={finishButton} variant="ink" size="lg" className="w-full" onClick={allDone}>
              Done
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Want this tour again? Tap your picture at the top, then Account.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const secret = shownStep?.tone === "secret"

  return (
    <>
      {/* Between pages: the same dim, and a small "one sec" if the page takes a moment. */}
      <div
        data-walk="moving"
        aria-hidden={shown ? true : undefined}
        style={{ backgroundColor: DIM }}
        className={cn(
          "fixed inset-0 z-[60] flex items-center justify-center transition-opacity duration-200",
          shown ? "pointer-events-none opacity-0" : "opacity-100",
        )}
      >
        {shown ? null : (
          <p
            role="status"
            className="flex animate-in items-center gap-2 rounded-full border-(length:--ink-width) border-border-strong bg-card px-5 py-3 text-base font-semibold text-card-foreground shadow-card delay-300 duration-200 fill-mode-both fade-in-0 motion-reduce:animate-none"
          >
            <Footprints aria-hidden className="size-5" />
            One sec…
          </p>
        )}
      </div>

      <Tour
        open={Boolean(shown)}
        value={0}
        dismissible={false}
        spotlightPadding={SPOTLIGHT_PADDING}
        sideOffset={18}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          nextButton.current?.focus({ preventScroll: true })
        }}
        onCloseAutoFocus={(event) => {
          // On the way to the finish card, that dialog takes the focus, not the page behind.
          if (keepFocus.current) event.preventDefault()
        }}
      >
        <TourPortal>
          {/* The library's backdrop is the click shield (its cut-out lets a tap reach the target);
              the dim and the rounded ink edge are drawn by the ring. */}
          <TourSpotlight className="z-[60] bg-transparent data-[state=closed]:animate-none data-[state=open]:animate-none" />
          {shownStep?.clickable ? null : <div aria-hidden className="fixed inset-0 z-[60]" />}
          <TourSpotlightRing
            data-walk="ring"
            className="z-[61] border-(length:--ink-width) border-border-strong ring-0 transition-[left,top,width,height,border-radius] duration-300 ease-out motion-reduce:transition-none"
            style={{ borderRadius: shown?.radius, boxShadow: `0 0 0 2px var(--background), 0 0 0 200vmax ${DIM}` }}
          />
          {shown && shownStep ? (
            <TourStep
              key={shown.step}
              target={shown.el}
              side={shown.side}
              collisionPadding={{ top: HEADER + 8, bottom: shown.bottomBar + 10, left: 12, right: 16 }}
              arrowPadding={22}
              role="dialog"
              aria-labelledby={titleId}
              aria-describedby={bodyId}
              data-walk="card"
              data-walk-step={shownHandoff ? "handoff" : shown.step}
              className="z-[62] w-[min(23rem,calc(100vw-1.75rem))] gap-0 rounded-none border-0 bg-transparent p-0 shadow-none"
            >
              <Card
                variant="ink"
                onKeyDown={wrapOptionTab}
                className={cn(
                  "animate-in gap-4 overflow-visible py-5 text-base duration-200 fade-in-0 zoom-in-95 motion-reduce:animate-none",
                  secret && "bg-hero text-foreground",
                )}
              >
                <TourArrow aria-hidden width={24} height={12} asChild className={cn("relative overflow-visible stroke-border-strong", secret ? "fill-(--hero)" : "fill-card")} style={{ top: "calc(var(--ink-width) * -1)", strokeWidth: "var(--ink-width)" }}>
                  <path d="M0,0 L15,10 L30,0" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
                </TourArrow>

                <div className="flex items-center justify-between gap-3 px-5">
                  <p className={cn("text-sm font-bold", secret ? "text-foreground/75" : "text-muted-foreground")}>
                    {shownHandoff ? shownHandoff.kicker : `Step ${stepAt} of ${stepTotal}`}
                  </p>
                  <Dots at={shownHandoff ? stepTotal + 1 : stepAt} total={stepTotal} />
                </div>

                <div className="flex flex-col gap-2 px-5">
                  {replay && shown.step === 1 ? <p className="text-sm font-semibold text-primary">Welcome back to the tour, {data.firstName}.</p> : null}
                  <h2 id={titleId} className={cn(display, "flex items-start gap-2.5 text-2xl leading-[1.15] text-balance")}>
                    {secret ? (
                      <span aria-hidden className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border-(length:--ink-width) border-border-strong bg-card text-card-foreground">
                        <Lock className="size-4" strokeWidth={2.5} />
                      </span>
                    ) : null}
                    {shownHandoff ? shownHandoff.title : shownStep.title}
                  </h2>
                  <p id={bodyId} className="text-base">
                    {shownHandoff ? shownHandoff.body : shownStep.body(shown.el)}
                  </p>
                  {shownHandoff ? <p className="text-sm text-muted-foreground">{shownHandoff.note}</p> : null}
                </div>

                <div className="flex items-center gap-2 px-5">
                  <TourSkip
                    variant="ghost"
                    size="lg"
                    aria-label={shownHandoff ? shownHandoff.later : "Skip the tour"}
                    className={cn("-ml-3 px-3", secret ? "text-foreground/75 hover:bg-foreground/10 hover:text-foreground" : "text-muted-foreground")}
                    onClick={(event) => {
                      event.preventDefault()
                      if (shownHandoff) later()
                      else skipTour()
                    }}
                  >
                    {shownHandoff ? shownHandoff.later : "Skip"}
                  </TourSkip>
                  <span className="flex-1" />
                  {shown.step > 1 && !shownHandoff ? (
                    <Button variant="ink-outline" size="lg" className="px-5" disabled={busy} onClick={back}>
                      Back
                    </Button>
                  ) : null}
                  <TourNext
                    ref={nextButton}
                    variant="ink"
                    size="lg"
                    aria-label={shownHandoff ? shownHandoff.primary : shownStep.next}
                    className="px-5"
                    disabled={busy}
                    onClick={(event) => {
                      event.preventDefault()
                      if (shownHandoff) showSteps()
                      else forward()
                    }}
                  >
                    {shownHandoff ? shownHandoff.primary : shownStep.next}
                    {shown.step < STEP_COUNT ? <ArrowRight aria-hidden /> : null}
                  </TourNext>
                </div>
              </Card>
            </TourStep>
          ) : null}
        </TourPortal>
      </Tour>
    </>
  )
}

/** A dot per stop: where you are in the walk. Decoration; the words "Step 2 of 4" carry it for everyone. */
function Dots({ at, total }: { at: number; total: number }) {
  return (
    <span aria-hidden className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            "size-2.5 rounded-full",
            i + 1 === at ? "w-6 bg-primary" : i + 1 < at ? "bg-foreground" : "bg-foreground/20",
          )}
        />
      ))}
    </span>
  )
}
