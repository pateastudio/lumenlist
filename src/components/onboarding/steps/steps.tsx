"use client"

import { useEffect, useImperativeHandle, useRef, useState, useSyncExternalStore } from "react"
import { usePathname } from "next/navigation"
import { PartyPopper } from "lucide-react"
import { shortName } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { TourEvent } from "@/lib/validations"
import type { TourData, TourState } from "@/types/tour"
import { firstVisible } from "../anchors"
import { buildTasks, pickPerson, trackFor, type Task, type TaskId } from "../tour-state"
import { useLocal } from "../tour-local"
import { ProgressRing, useToastShowing } from "./bits"
import { Hint } from "./hint"
import { StepsSheet } from "./steps-sheet"
import { DoneView, ListView, SecretView } from "./views"

// First Steps (#98): a short checklist of real things, ticked from real data, behind a small pill
// on every signed-in page, plus one hint in place where a thing happens. What it must remember
// goes to the server as tour events; what is only decoration stays in this browser.

type View = "list" | "secret" | "done"

export type StepsControls = { open: () => void }
export type StepsProps = {
  data: TourData
  state: TourState
  send: (event: TourEvent) => void
  /** "launcher": the pill only (while the walk's last card points at it). "full": everything. */
  show: "launcher" | "full"
  controls: React.RefObject<StepsControls | null>
}

/** The first "I'll get this" that is really on screen (closed sheets render nothing, hidden ones have no box). */
const findDibs = () => firstVisible('[data-claim-state="available"] button')

const never = () => () => {}

/** A list of ids as this browser kept it. Null when nothing was kept. */
function parseList(raw: string | null): string[] | null {
  if (raw === null) return null
  try {
    const value: unknown = JSON.parse(raw)
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : []
  } catch {
    return []
  }
}

export function Steps({ data, state, send, show, controls }: StepsProps) {
  const pathname = usePathname()
  // False on the server and for the first pass in the browser, when what this tab remembers can't
  // be read yet. Nothing is decided from "nothing remembered" until it can.
  const ready = useSyncExternalStore(never, () => true, () => false)
  // What the checklist last showed, for the little "Nice one" when something got done meanwhile.
  // Per browser is enough: it is decoration.
  const [lastRaw, setLast] = useLocal(data.userId, "last-done", "local")
  const [headRaw, setHead] = useLocal(data.userId, "head-start", "local")
  // The list the walk left them on doesn't count as a peek: they have to go and look themselves.
  const [leftOn, setLeftOn] = useLocal(data.userId, "left-on", "session")
  // A page the walk had already asked for when it was skipped. It still arrives, and it is no peek either.
  const [heading, setHeading] = useLocal(data.userId, "walk-heading", "session")

  const [open, setOpen] = useState(false)
  const [view, setView] = useState<View>("list")
  const [fresh, setFresh] = useState<string[]>([])
  const [cameVia, setCameVia] = useState<TaskId | null>(null)
  const launcherRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const toastShowing = useToastShowing()

  const track = state.track ?? trackFor(data)
  const tasks = buildTasks(data, track, state)
  const doneIds = tasks.filter((t) => t.done).map((t) => t.id as string)
  const doneKey = JSON.stringify(doneIds)
  const total = tasks.length
  const allDone = doneIds.length === total
  const next = tasks.find((t) => !t.done && !t.waiting) ?? null
  const last = parseList(lastRaw)
  const headStart = parseList(headRaw) ?? []
  const hintsRead = state.hintsRead
  const person = pickPerson(data)

  // Going somewhere else (a tab under the open panel, say) puts the panel away.
  const [lastPath, setLastPath] = useState(pathname)
  if (pathname !== lastPath) {
    setLastPath(pathname)
    if (open && view !== "done") setOpen(false)
  }

  // The first time the pill appears: fix the track, and note what was already done on arrival.
  const starting = state.track === null
  useEffect(() => {
    if (!starting) return
    send({ event: "steps_shown", track: trackFor(data) })
    setHead(doneKey)
    setLast(doneKey)
    // Runs once: the event sets the track, which turns `starting` off.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [starting])

  // "Peek at a list" has no data behind it: opening someone's list yourself is the proof.
  const onSomeonesList = pathname.startsWith("/members/")
  useEffect(() => {
    if (!ready || pathname === leftOn) return
    // The walk's last move has landed: this is now the page it left them on. Anywhere else, they
    // went themselves. (`left-on` is written first, so no render in between sees a peek.)
    if (heading && pathname === heading) setLeftOn(pathname)
    else if (leftOn) setLeftOn(null)
    if (heading) setHeading(null)
  }, [ready, leftOn, heading, pathname, setLeftOn, setHeading])
  useEffect(() => {
    if (ready && show === "full" && onSomeonesList && pathname !== leftOn && pathname !== heading && !state.peeked) send({ event: "peeked" })
  }, [ready, show, onSomeonesList, pathname, leftOn, heading, state.peeked, send])

  /** Show the list (or the party), celebrating whatever got done since the panel was last looked at. */
  function showList(done: string[]) {
    setFresh(last ? done.filter((id) => !last.includes(id)) : [])
    setLast(JSON.stringify(done))
    setView(done.length === total ? "done" : "list")
  }

  function openPanel() {
    showList(doneIds)
    setOpen(true)
  }

  useImperativeHandle(controls, () => ({ open: openPanel }))

  // Moving between views inside the open panel: put focus on the new view's main thing.
  useEffect(() => {
    if (!open) return
    // A beat later than the dialog's own focus handling, which otherwise wins when the pressed button unmounts.
    const id = window.setTimeout(() => popupRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus(), 60)
    return () => window.clearTimeout(id)
  }, [open, view])

  function closePanel() {
    setOpen(false)
    if (view === "done") send({ event: "steps_completed" })
  }

  function go(task: Task) {
    setCameVia(task.id)
    setOpen(false)
    // Asking for the list is going to look, even when the walk left them standing on it.
    if (task.id === "peek") {
      setLeftOn(null)
      setHeading(null)
    }
  }

  function explain() {
    if (!state.secretSeen) send({ event: "secret_seen" })
    setView("secret")
  }

  // The one floating hint: on someone's list, until dibs is called or the hint has been read. (The
  // hints for adding a gift and for inviting are notes in their own pages: see inline-hint.tsx.)
  let dibsHint: string | null = null
  if (show === "full" && !open && onSomeonesList && !hintsRead.includes("dibs") && tasks.some((t) => t.id === "dibs" && !t.done)) {
    const owner = data.people.find((p) => pathname === `/members/${p.id}`)
    const who = owner ? shortName(owner.name) || owner.name : "They"
    dibsHint = `Tap this and it's yours to give. ${who} won't know.`
  }

  const unseen = !open && last !== null && doneIds.some((id) => !last.includes(id))
  const label = allDone ? `First steps, all ${total} done. Open to finish.` : `First steps, ${doneIds.length} of ${total} done`

  return (
    <>
      {/* Room at the end of every page, so the launcher never rests on the last button of a form. */}
      <div aria-hidden className="h-14 shrink-0 md:h-6" />

      <button
        ref={launcherRef}
        type="button"
        onClick={show === "full" ? openPanel : undefined}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-first-steps-launcher
        className={cn(
          "ink-card fixed right-3 bottom-[calc(4rem+env(safe-area-inset-bottom)+0.625rem)] z-[45] flex h-11 items-center gap-2 rounded-full bg-card pr-3.5 pl-2 text-[15px] text-card-foreground outline-none transition-[opacity,translate] duration-200 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none md:right-6 md:bottom-6",
          unseen && "animate-[fs-nudge_.9s_ease-in-out_.4s_2] motion-reduce:animate-none",
          allDone && "bg-secondary text-secondary-foreground hover:bg-secondary",
          // On phones a toast lands exactly here: step aside until it has gone.
          toastShowing && "max-md:pointer-events-none max-md:translate-y-2 max-md:opacity-0",
          open && "pointer-events-none opacity-0",
        )}
      >
        {allDone ? <PartyPopper className="size-6" aria-hidden /> : <ProgressRing done={doneIds.length} total={total} />}
        <span className="font-bold">{allDone ? "All done" : unseen ? "Nice one" : "First steps"}</span>
        <span className="text-sm text-muted-foreground tabular-nums" aria-hidden>
          {allDone ? "Tap to finish" : `${doneIds.length} of ${total}`}
          <span className="hidden md:inline">{allDone ? "" : " done"}</span>
        </span>
      </button>

      <StepsSheet open={open} onOpenChange={(isOpen) => (isOpen ? openPanel() : closePanel())} view={view} popupRef={popupRef} returnFocusTo={launcherRef}>
        {view === "secret" ? (
          <SecretView name={person?.short ?? null} onBack={() => showList(doneIds)} onDone={() => showList(doneIds)} />
        ) : view === "done" ? (
          <DoneView firstName={data.firstName} total={total} onClose={closePanel} />
        ) : (
          <ListView
            tasks={tasks}
            nextId={next?.id ?? null}
            fresh={fresh}
            headStart={headStart}
            pathname={pathname}
            comesNext={track === "solo" ? "Calling dibs on gifts comes next, once your family joins." : null}
            onGo={go}
            onExplain={explain}
            onHide={() => send({ event: "steps_hidden" })}
          />
        )}
      </StepsSheet>

      {dibsHint ? (
        <Hint key={pathname} find={findDibs} text={dibsHint} onDismiss={() => send({ event: "hint_read", id: "dibs" })} bringIntoView={cameVia === "dibs"} />
      ) : null}
    </>
  )
}
