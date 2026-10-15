"use client"

import { useTour } from "@/components/onboarding/tour-provider"

/** "Welcome" on a first visit (the tour's walk hasn't ended), "Welcome back" ever after. */
export function WelcomeEyebrow() {
  const tour = useTour()
  return <p className="text-sm font-bold text-foreground/70">{tour && !tour.state.walkEnded ? "Welcome" : "Welcome back"}</p>
}
