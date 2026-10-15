"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"
import type { TourEvent } from "@/lib/validations"
import type { TourData, TourInfo, TourState } from "@/types/tour"
import { createSender } from "./tour-events"
import { applyEvent, mergeState, phaseOf, type Phase } from "./tour-state"
import { TourUi } from "./tour-ui"

type TourValue = { data: TourData; state: TourState; phase: Phase; send: (event: TourEvent) => void }

const TourContext = createContext<TourValue | null>(null)

/** The running tour, or null once it is over (and outside the signed-in app). */
export function useTour(): TourValue | null {
  return useContext(TourContext)
}

/**
 * Wraps the signed-in app. While the tour is running it keeps this tab's copy of the state (shown
 * at once, sent behind), joined with whatever the server says on each refresh. The children are
 * always rendered the same way, so a tour ending never remounts the page.
 */
export function TourProvider({ info, children }: { info: TourInfo; children: React.ReactNode }) {
  return (
    // A restart is a new run: start it from a clean slate.
    <RunningTour key={info.run} info={info}>
      {children}
    </RunningTour>
  )
}

function RunningTour({ info, children }: { info: TourInfo; children: React.ReactNode }) {
  const server = info.over ? null : info.state
  const [local, setLocal] = useState<TourState | null>(server)
  const [sender] = useState(() => createSender())

  const send = useCallback((event: TourEvent) => {
    setLocal((now) => (now ? applyEvent(now, event) : now))
    void sender(event)
  }, [sender])

  const value = useMemo<TourValue | null>(() => {
    if (info.over || !server) return null
    const state = local ? mergeState(server, local) : server
    const phase = phaseOf(state)
    return phase === "over" ? null : { data: info.data, state, phase, send }
  }, [info, server, local, send])

  return (
    <TourContext.Provider value={value}>
      {children}
      {value ? <TourUi /> : null}
    </TourContext.Provider>
  )
}
