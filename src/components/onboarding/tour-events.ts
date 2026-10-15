import type { TourEvent } from "@/lib/validations"

/** Tells the server one thing happened. True when it was recorded. Never throws. */
export async function postTourEvent(event: TourEvent): Promise<boolean> {
  try {
    const res = await fetch("/api/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
      // The walk sometimes sends just as it moves to another page.
      keepalive: true,
    })
    return res.ok
  } catch {
    return false
  }
}

const TRIES = 5

/**
 * Sends events in order. One that fails waits and goes again, first, with the next event, so a
 * dropped connection costs nothing but time. Events are safe to repeat (the server keeps the
 * first outcome). An event identical to one already waiting is not queued again. After five
 * tries an event is dropped and the rest carry on: the worst case is that the person is offered
 * something once more.
 */
export function createSender(post: (event: TourEvent) => Promise<boolean> = postTourEvent) {
  const waiting: { event: TourEvent; tries: number }[] = []
  let busy: Promise<void> = Promise.resolve()

  async function flush() {
    while (waiting.length) {
      const head = waiting[0]
      head.tries++
      let ok = false
      try {
        ok = await post(head.event)
      } catch {
        ok = false
      }
      if (ok) {
        waiting.shift()
      } else if (head.tries >= TRIES) {
        waiting.shift() // dropped; go on to the next event
      } else {
        return
      }
    }
  }

  return function send(event: TourEvent): Promise<void> {
    const same = JSON.stringify(event)
    if (!waiting.some((w) => JSON.stringify(w.event) === same)) waiting.push({ event, tries: 0 })
    busy = busy.then(flush)
    return busy
  }
}
