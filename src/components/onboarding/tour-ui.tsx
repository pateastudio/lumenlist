"use client"

import { useCallback, useRef } from "react"
import { usePathname } from "next/navigation"
import { findAnchor } from "./anchors"
import { useTour } from "./tour-provider"
import { buildTasks, trackFor } from "./tour-state"
import { useLocal } from "./tour-local"
import { Steps, type StepsControls } from "./steps/steps"
import { useWalkAtHandoff, Walk } from "./walk/walk"

/** The First Steps pill: what the walk's last card points at. */
const findPill = () => document.querySelector<HTMLElement>("[data-first-steps-launcher]")

/**
 * Everything the tour draws over the app: the walk first, then First Steps. Ending or skipping
 * the walk never ticks a step and never ends the steps, unless there is nothing left on them.
 */
export function TourUi() {
  const tour = useTour()
  const pathname = usePathname()
  // The list the walk leaves them on does not count as a peek (see steps/steps.tsx). Skipped
  // between two stops, that is the page they are on and then the one the walk had asked for.
  const [, setLeftOn] = useLocal(tour?.data.userId ?? "", "left-on", "session")
  const [, setHeading] = useLocal(tour?.data.userId ?? "", "walk-heading", "session")
  const controls = useRef<StepsControls | null>(null)
  const atHandoff = useWalkAtHandoff(tour?.data.userId ?? "")

  const data = tour?.data
  const state = tour?.state
  const send = tour?.send
  const left = data && state ? buildTasks(data, state.track ?? trackFor(data), state).filter((t) => !t.done).length : 0

  const endWalk = useCallback(
    (how: "walk_completed" | "walk_skipped", heading: string | null = null) => {
      setLeftOn(pathname)
      setHeading(heading)
      send?.({ event: how })
      // Nothing left to do: the whole tour is over with the walk.
      if (left === 0) send?.({ event: "steps_completed" })
    },
    [setLeftOn, setHeading, pathname, send, left],
  )
  // The walk's card held the keyboard and is about to go: hand it to the pill, or to the first tab
  // when there is no pill (nothing left to do), so the next Tab doesn't start from the top of the page.
  const handBackFocus = useCallback(() => {
    window.setTimeout(() => (findPill() ?? findAnchor("tab-home"))?.focus(), 80)
  }, [])
  const skip = useCallback(
    (heading: string | null) => {
      endWalk("walk_skipped", heading)
      handBackFocus()
    },
    [endWalk, handBackFocus],
  )
  const showSteps = useCallback(() => {
    endWalk("walk_completed")
    // Once the walk's card has gone, open the list it was pointing at.
    window.setTimeout(() => controls.current?.open(), 80)
  }, [endWalk])
  const later = useCallback(() => {
    endWalk("walk_completed")
    handBackFocus()
  }, [endWalk, handBackFocus])
  // "Done" on the last card when nothing is left: the same ending, with no pill to go to.
  const allDone = later

  if (!tour || !data || !state) return null

  const walking = tour.phase === "walk"
  return (
    <>
      {walking ? <Walk data={data} replay={state.replay} left={left} findPill={findPill} onSkip={skip} onShowSteps={showSteps} onLater={later} onAllDone={allDone} /> : null}
      {/* Nothing of the checklist during the walk; only its pill while the last card points at it. */}
      {!walking || (atHandoff && left > 0) ? <Steps data={data} state={state} send={tour.send} show={walking ? "launcher" : "full"} controls={controls} /> : null}
    </>
  )
}
