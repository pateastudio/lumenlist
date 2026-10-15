"use client"

import { useEffect, useRef, useState } from "react"
import { arrow, autoUpdate, flip, offset, shift, useFloating } from "@floating-ui/react-dom"

/**
 * One small ink bubble pointing at a real control. Not a dialog: no dimming, no focus trap, the
 * page stays fully usable. It scrolls with the page and waits quietly until its anchor exists.
 */
export function Hint({
  find,
  text,
  onDismiss,
  bringIntoView,
}: {
  /** Returns the element to point at, or null while it isn't on the page. */
  find: () => HTMLElement | null
  text: string
  onDismiss: () => void
  /** They came here by tapping the task: scroll the control into view once. */
  bringIntoView: boolean
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [arrowEl, setArrowEl] = useState<HTMLSpanElement | null>(null)
  const [floatingEl, setFloatingEl] = useState<HTMLDivElement | null>(null)
  const scrolled = useRef(false)

  // The page arrives after the route changes, and re-renders can swap the node, so keep looking.
  useEffect(() => {
    const look = () => setAnchor((prev) => {
      const el = find()
      return el === prev ? prev : el
    })
    const first = window.setTimeout(look, 0)
    const timer = window.setInterval(look, 300)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(timer)
    }
  }, [find])

  const { floatingStyles, placement: landed, middlewareData, isPositioned } = useFloating({
    strategy: "absolute",
    placement: "top",
    transform: false,
    elements: { reference: anchor, floating: floatingEl },
    whileElementsMounted: autoUpdate,
    middleware: [offset(12), flip({ padding: { top: 68, bottom: 76 } }), shift({ padding: 12 }), ...(arrowEl ? [arrow({ element: arrowEl })] : [])],
  })

  useEffect(() => {
    if (!anchor || !bringIntoView || scrolled.current) return
    scrolled.current = true
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    anchor.scrollIntoView({ block: "center", behavior: calm ? "auto" : "smooth" })
  }, [anchor, bringIntoView])

  if (!anchor) return null
  const above = landed.startsWith("top")

  return (
    <div ref={setFloatingEl} style={{ ...floatingStyles, visibility: isPositioned ? "visible" : "hidden" }} className="z-30 w-[min(21rem,calc(100vw-1.5rem))]" data-first-steps-hint>
      <div
        role="note"
        aria-live="polite"
        className="relative animate-[fs-rise_.25s_ease-out_both] rounded-xl bg-foreground p-3.5 text-background shadow-lg motion-reduce:animate-none"
      >
        <span
          ref={setArrowEl}
          aria-hidden
          className="absolute size-3.5 rotate-45 bg-foreground"
          style={{ left: middlewareData.arrow?.x ?? 24, [above ? "bottom" : "top"]: -6 }}
        />
        <div className="flex items-end gap-3">
          <p className="min-w-0 flex-1 text-base leading-snug font-medium text-pretty">{text}</p>
          <button
            type="button"
            onClick={onDismiss}
            className="h-11 shrink-0 rounded-button bg-background px-4 text-base font-(weight:--button-weight) text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
