"use client"

import { Button } from "@/components/ui/button"
import type { HintId } from "@/types/tour"
import { useTour } from "../tour-provider"
import { buildTasks, trackFor, type TaskId } from "../tour-state"

const TASK: Record<HintId, TaskId> = { add: "add", dibs: "dibs", invite: "invite" }

/**
 * A First Steps hint that lives in the page it is about, in the flow, so it covers nothing. Shown
 * only while the steps are running, its step is still to do, and it hasn't been read.
 */
export function TourHint({ id, children }: { id: HintId; children: React.ReactNode }) {
  const tour = useTour()
  if (!tour || tour.phase !== "steps" || tour.state.hintsRead.includes(id)) return null
  const tasks = buildTasks(tour.data, tour.state.track ?? trackFor(tour.data), tour.state)
  if (!tasks.some((t) => t.id === TASK[id] && !t.done)) return null
  return (
    <div role="note" data-tour-hint={id} className="ink-card mt-3 flex items-center gap-3 rounded-xl bg-card p-3 text-base text-card-foreground">
      <span aria-hidden className="text-xl leading-none">👆</span>
      <p className="min-w-0 flex-1">{children}</p>
      <Button type="button" variant="ink-outline" className="h-11 shrink-0 px-4" onClick={() => tour.send({ event: "hint_read", id })}>
        Got it
      </Button>
    </div>
  )
}
