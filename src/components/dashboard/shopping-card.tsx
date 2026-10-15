import { Check, Gift } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

export type ShoppingRow = {
  id: string
  title: string
  /** "for Dan · $18", already formatted. Empty hides the line. */
  detail: string
  bought: boolean
  /** What sits at the right of a row that isn't bought yet (the app's Mark bought button). */
  action?: React.ReactNode
  className?: string
  /** Gives the row's <li> a ref and tabIndex -1, so a caller can park focus there when the row's button goes away. Home leaves it out. */
  rowRef?: React.Ref<HTMLLIElement>
}

/**
 * The "You're shopping for" card: how many are bought, a bar, and a row per gift. It only draws
 * what it is given. Home passes the person's claims; the marketing page passes the made-up family's.
 */
export function ShoppingCard({
  rows,
  headingLevel = "h2",
  emptyText,
  compact = false,
  className,
}: {
  rows: ShoppingRow[]
  headingLevel?: "h2" | "h3"
  /** Shown in place of the rows when there are none. Home never needs it: it has its own empty state. */
  emptyText?: string
  /**
   * For a card drawn somewhere narrow (the marketing page's phone deck): while the card has less
   * than 19rem inside, each row drops its icon tile so the title keeps its room. Home never sets
   * it, so its rows always have their tiles.
   */
  compact?: boolean
  className?: string
}) {
  const Heading = headingLevel
  const bought = rows.filter((r) => r.bought).length

  return (
    <Card variant="ink" className={cn(compact && "@container", "gap-0 p-5", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <Heading className="font-display text-2xl font-(weight:--display-weight)">You&apos;re shopping for</Heading>
        <span className="text-sm font-semibold text-muted-foreground">
          {bought} of {rows.length} bought
        </span>
      </div>
      <Progress value={rows.length === 0 ? 0 : (bought / rows.length) * 100} className="mt-3" aria-label="Gifts bought" />
      {rows.length === 0 && emptyText ? (
        <p className="mt-4 text-base text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {rows.map((row) => (
            <li key={row.id} ref={row.rowRef} tabIndex={row.rowRef ? -1 : undefined} className={cn("flex items-center gap-3 py-3", row.className)}>
              <span
                className={cn(compact ? "hidden @min-[19rem]:flex" : "flex", "size-12 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground")}
              >
                {row.bought ? <Check className="size-5" /> : <Gift className="size-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 leading-snug font-semibold">{row.title}</p>
                {row.detail ? <p className="text-sm text-muted-foreground">{row.detail}</p> : null}
              </div>
              {row.bought ? (
                <span className="inline-flex h-7 shrink-0 items-center rounded-full bg-accent px-3 text-xs font-bold text-accent-foreground">
                  Bought
                </span>
              ) : (
                row.action
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
