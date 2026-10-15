import "server-only"
import { after } from "next/server"
import { describeError } from "@/lib/log"

// Work that must finish but shouldn't hold up (or show in the timing of) the response: auth
// emails. Next's after() keeps the invocation alive until it's done, so Lambda doesn't freeze
// mid-send, and a failure is logged rather than thrown into a request that already answered.
export function inBackground(label: string, task: () => Promise<unknown>): void {
  // Started inside the chain, so a task that throws synchronously is caught too.
  after(() =>
    Promise.resolve()
      .then(task)
      .then(
        () => undefined,
        (error: unknown) => {
          console.error(`[background] ${label} failed:`, describeError(error))
        },
      ),
  )
}
