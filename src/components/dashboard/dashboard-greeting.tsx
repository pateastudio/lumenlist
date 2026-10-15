"use client"

import { useSyncExternalStore } from "react"

type DashboardGreetingProps = {
  firstName: string
}

function greetingByHour(hour: number): string {
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

const subscribe = () => () => {}
// Local time, read only on the client. The server and the first client render get null, so the
// markup matches and nobody sees the server's (UTC) time of day.
const getClientGreeting = () => greetingByHour(new Date().getHours())
const getServerGreeting = () => null

export function DashboardGreeting({ firstName }: DashboardGreetingProps) {
  const greeting = useSyncExternalStore(subscribe, getClientGreeting, getServerGreeting)

  return (
    <h1 className="mt-1 font-display text-4xl leading-tight font-(weight:--display-weight) tracking-(--display-tracking) break-words text-foreground sm:text-5xl">
      {greeting ?? "Hi"},{" "}
      <span className="underline decoration-primary decoration-4 underline-offset-4">{firstName}</span>
    </h1>
  )
}
