"use client"

import { useSyncExternalStore } from "react"
import { cn } from "@/lib/utils"

/** The little ring on the launcher: how far along, at a glance. Decorative; the button's name says it. */
export function ProgressRing({ done, total, className }: { done: number; total: number; className?: string }) {
  const r = 9
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 24 24" className={cn("size-6 -rotate-90", className)} aria-hidden>
      <circle cx="12" cy="12" r={r} fill="none" strokeWidth="4" className="stroke-muted" />
      <circle
        cx="12"
        cy="12"
        r={r}
        fill="none"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - (total ? done / total : 0))}
        className="stroke-primary transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none"
      />
    </svg>
  )
}

const PIECES = ["bg-primary", "bg-hero", "bg-success", "bg-tone-0-bg", "bg-tone-3-fg", "bg-destructive"]

/**
 * Confetti in theme colours that falls once and settles around the heading. With reduced motion
 * it is already settled: same picture, no movement.
 */
export function Confetti({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-28 overflow-hidden", className)} aria-hidden>
      {Array.from({ length: 22 }, (_, i) => {
        const left = 2 + ((i * 61 + 7) % 83)
        const top = 6 + ((i * i * 13 + i * 7) % 78)
        const turn = ((i * 67) % 140) - 70
        return (
          <span
            key={i}
            className={cn(
              "absolute block animate-[fs-fall_1.1s_cubic-bezier(.2,.7,.3,1)_both] border border-border-strong motion-reduce:animate-none",
              i % 3 === 0 ? "size-2.5 rounded-full" : i % 3 === 1 ? "h-3 w-2 rounded-[2px]" : "h-1.5 w-3.5 rounded-[2px]",
              PIECES[i % PIECES.length],
            )}
            style={{ left: `${left}%`, top, rotate: `${turn}deg`, animationDelay: `${(i % 7) * 70}ms`, ["--fs-turn" as string]: `${turn * 3}deg` }}
          />
        )
      })}
    </div>
  )
}

function watchToasts(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.body, { childList: true, subtree: true })
  return () => observer.disconnect()
}

/** True while a toast is on screen, so the launcher can step out of its way on phones. */
export function useToastShowing(): boolean {
  return useSyncExternalStore(watchToasts, () => document.querySelector("[data-sonner-toast]") !== null, () => false)
}
