"use client"

import Link from "next/link"
import { ArrowLeft, Check, ChevronRight, Eye, EyeOff, Gift } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { StatusChip } from "@/components/shared/status-chip"
import { cn } from "@/lib/utils"
import { Confetti } from "./bits"
import { countWord, type Task } from "../tour-state"

const display = "font-display font-(weight:--display-weight) tracking-(--display-tracking)"

function Meter({ done, total }: { done: number; total: number }) {
  return (
    <div className="flex items-center gap-3">
      <Progress
        value={done}
        max={total}
        aria-label="First steps"
        aria-valuetext={`${done} of ${total} done`}
        className="flex-1 [&_[data-slot=progress-indicator]]:rounded-full [&_[data-slot=progress-indicator]]:duration-500 motion-reduce:[&_[data-slot=progress-indicator]]:transition-none [&_[data-slot=progress-track]]:h-3 [&_[data-slot=progress-track]]:overflow-hidden [&_[data-slot=progress-track]]:border-(length:--ink-width) [&_[data-slot=progress-track]]:border-border-strong [&_[data-slot=progress-track]]:bg-card"
      />
      <p className="shrink-0 text-sm font-bold tabular-nums" aria-hidden>
        {done} of {total} done
      </p>
    </div>
  )
}

function Tick({ task, index, next, fresh }: { task: Task; index: number; next: boolean; fresh: boolean }) {
  return (
    <span
      className={cn(
        "relative grid size-9 shrink-0 place-items-center rounded-full border-(length:--ink-width) border-border-strong font-display text-base font-(weight:--display-weight-soft)",
        task.done ? "bg-success text-background" : next ? "bg-primary text-primary-foreground" : "bg-card text-foreground",
        fresh && "animate-[fs-pop_.5s_ease-out_.15s_both] motion-reduce:animate-none",
      )}
      aria-hidden
    >
      {fresh ? <span className="absolute inset-0 animate-[fs-ring_.8s_ease-out_.3s_both] rounded-full border-2 border-success motion-reduce:hidden" /> : null}
      {task.done ? <Check className="size-5" strokeWidth={3} /> : index + 1}
    </span>
  )
}

/** The checklist itself. Ticks come from real data; the next thing to do stands out. */
export function ListView({
  tasks,
  nextId,
  fresh,
  headStart,
  pathname,
  comesNext,
  onGo,
  onExplain,
  onHide,
}: {
  tasks: Task[]
  nextId: string | null
  /** Tasks that flipped to done since the panel was last open: they get the little celebration. */
  fresh: string[]
  /** Tasks that were already done when the person first arrived. */
  headStart: string[]
  pathname: string
  /** A quiet line for what isn't on the list yet (someone on their own can't call dibs so far). */
  comesNext: string | null
  onGo: (task: Task) => void
  onExplain: () => void
  onHide: () => void
}) {
  const done = tasks.filter((t) => t.done).length

  return (
    <div className="space-y-4">
      <div className="space-y-3 pr-10">
        <SheetTitle className={cn(display, "text-2xl leading-tight")}>First steps</SheetTitle>
        <SheetDescription className="sr-only">
          {done} of {tasks.length} done. Do them in any order, whenever you like.
        </SheetDescription>
      </div>
      <Meter done={done} total={tasks.length} />

      <ol className="space-y-2.5">
        {tasks.map((task, index) => {
          const next = task.id === nextId
          const isFresh = fresh.includes(task.id)
          const sub = task.done ? (isFresh ? "Done. Nice one." : headStart.includes(task.id) ? "Already done. Nice." : "Done.") : task.sub
          const rowClass = cn(
            "flex min-h-16 w-full items-center gap-3 rounded-xl border-(length:--ink-width) px-3 py-2.5 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring",
            next ? "border-border-strong bg-secondary text-secondary-foreground shadow-button" : "border-border bg-card",
            !task.waiting && !next && "hover:bg-muted",
            task.waiting && "border-dashed bg-transparent",
          )
          const body = (
            <>
              <Tick task={task} index={index} next={next} fresh={isFresh} />
              <span className="min-w-0 flex-1">
                <span className={cn("block text-base leading-snug font-bold", task.done && !next && "text-foreground/70", task.waiting && "text-foreground/70")}>{task.title}</span>
                <span className={cn("block text-sm", next ? "opacity-80" : "text-muted-foreground", isFresh && "font-bold text-success")}>{sub}</span>
                <span className="sr-only">{task.done ? " (done)" : next ? " (up next)" : task.waiting ? " (not yet)" : ""}</span>
              </span>
              {task.waiting ? null : task.href ? (
                <ChevronRight className="size-5 shrink-0 opacity-60" aria-hidden />
              ) : (
                <Eye className="size-5 shrink-0 opacity-60" aria-hidden />
              )}
            </>
          )
          return (
            <li key={task.id}>
              {task.waiting ? (
                <div className={rowClass}>{body}</div>
              ) : task.href ? (
                <Link
                  prefetch={false}
                  href={task.href}
                  onClick={() => onGo(task)}
                  aria-current={pathname === task.href.split("?")[0] ? "page" : undefined}
                  className={rowClass}
                  data-autofocus={next ? "" : undefined}
                  data-task={task.id}
                >
                  {body}
                </Link>
              ) : (
                <button type="button" onClick={onExplain} className={rowClass} data-autofocus={next ? "" : undefined} data-task={task.id}>
                  {body}
                </button>
              )}
            </li>
          )
        })}
      </ol>

      {comesNext ? <p className="px-1 text-sm text-muted-foreground">{comesNext}</p> : null}

      <p className="px-1 text-sm text-muted-foreground">
        <button type="button" onClick={onHide} className="-my-3 inline-flex h-11 items-center font-bold text-foreground underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring">
          Hide these steps
        </button>
        <span className="block">You can bring them back from your account.</span>
      </p>
    </div>
  )
}

function MiniList({ caption, owner, icon, children }: { caption: string; owner: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <figure className="min-w-0">
      <figcaption className="mb-2 flex items-center gap-1.5 text-sm font-bold">
        {icon}
        {caption}
      </figcaption>
      <div className="ink-card rounded-xl bg-card p-2.5">
        <p className="truncate text-xs font-bold text-muted-foreground">{owner}</p>
        <div className="mt-1.5 grid aspect-[2/1] place-items-center rounded-md border-(length:--ink-width) border-border-strong bg-tone-3-bg text-tone-3-fg">
          <Gift className="size-7" aria-hidden />
        </div>
        <p className="mt-2 font-display text-base leading-tight font-(weight:--display-weight-soft)">Cosy slippers</p>
        <div className="mt-2 flex h-8 items-center">{children}</div>
      </div>
    </figure>
  )
}

/** The ten-second explainer: the same gift, seen from both sides. */
export function SecretView({ name, onBack, onDone }: { name: string | null; onBack: () => void; onDone: () => void }) {
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="-mt-2 -ml-2 inline-flex h-11 items-center gap-1.5 rounded-button px-2 text-sm font-bold text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" aria-hidden /> First steps
      </button>
      <div className="space-y-1">
        <SheetTitle className={cn(display, "text-2xl leading-tight")} tabIndex={-1} data-autofocus>
          Surprises stay secret
        </SheetTitle>
        <SheetDescription className="text-base text-foreground/80">
          Say you tap &quot;I&apos;ll get this&quot; on {name ? `${name}'s list` : "someone's list"}.
        </SheetDescription>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MiniList caption="What you see" owner={name ? `${name}'s list` : "Their list"} icon={<Eye className="size-4" aria-hidden />}>
          <StatusChip state="mine" className="origin-left -rotate-3 animate-[fs-stamp_.45s_ease-out_.5s_both] px-2 motion-reduce:animate-none" />
        </MiniList>
        <MiniList caption={name ? `What ${name} sees` : "What they see"} owner="My list" icon={<EyeOff className="size-4" aria-hidden />}>
          <span className="inline-flex h-7 items-center rounded-chip border-(length:--ink-width) border-dashed border-border px-2 text-xs font-(weight:--label-weight) text-muted-foreground">
            Nothing at all
          </span>
        </MiniList>
      </div>

      <p className={cn(display, "text-xl leading-snug text-balance")}>
        Nobody sees who&apos;s getting what from their own list. Not even a hint.
      </p>
      <p className="text-base text-muted-foreground">Same goes for your list: you won&apos;t see who&apos;s getting yours.</p>

      <Button variant="ink" size="lg" className="w-full" onClick={onDone}>
        Got it
      </Button>
    </div>
  )
}

/** Everything ticked. A small party, then the launcher goes away for good. */
export function DoneView({ firstName, total, onClose }: { firstName: string; total: number; onClose: () => void }) {
  return (
    <div className="relative space-y-4 pt-24 text-center">
      <Confetti className="-mx-5 -mt-5" />
      <SheetTitle className={cn(display, "text-3xl leading-[1.1] text-balance")}>You&apos;re all set, {firstName}.</SheetTitle>
      <SheetDescription className="text-base text-foreground/80">
        {`All ${countWord(total).toLowerCase()} done. Lumen's yours now. If you ever want these steps again, they're in your account.`}
      </SheetDescription>
      <Meter done={total} total={total} />
      <Button variant="ink" size="lg" className="w-full" onClick={onClose} data-autofocus>
        Lovely, thanks
      </Button>
    </div>
  )
}
