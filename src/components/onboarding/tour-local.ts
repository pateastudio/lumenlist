"use client"

import { useCallback, useSyncExternalStore } from "react"

const EVENT = "lumen-tour-local"
const key = (userId: string, name: string) => `lumen-tour:${userId}:${name}`
const box = (where: "session" | "local") => (where === "session" ? window.sessionStorage : window.localStorage)

function read(where: "session" | "local", k: string): string | null {
  try {
    return box(where).getItem(k)
  } catch {
    return null
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange)
  window.addEventListener("storage", onChange)
  return () => {
    window.removeEventListener(EVENT, onChange)
    window.removeEventListener("storage", onChange)
  }
}

/** A string kept in this browser, per person. Null on the server, before hydration and when storage is blocked. */
export function useLocal(userId: string, name: string, where: "session" | "local"): [string | null, (value: string | null) => void] {
  const k = key(userId, name)
  const value = useSyncExternalStore(subscribe, () => read(where, k), () => null)
  const set = useCallback(
    (next: string | null) => {
      try {
        if (next === null) box(where).removeItem(k)
        else box(where).setItem(k, next)
      } catch {
        // Private mode or blocked storage: it just won't be remembered.
      }
      window.dispatchEvent(new Event(EVENT))
    },
    [k, where],
  )
  return [value, set]
}

/** Forgets everything this browser remembered about the tour for this person (on restart). */
export function clearLocal(userId: string) {
  const prefix = `lumen-tour:${userId}:`
  for (const where of ["session", "local"] as const) {
    try {
      const store = box(where)
      for (const k of Object.keys(store)) if (k.startsWith(prefix)) store.removeItem(k)
    } catch {
      // nothing to clear
    }
  }
  window.dispatchEvent(new Event(EVENT))
}
