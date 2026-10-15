import Link from "next/link"
import { Eye, Plus } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"

/** The "Add a gift" button of My list: in the header once there are gifts, in the empty state before. */
export function AddGiftButton({ href = "/gifts/new" }: { href?: string }) {
  return (
    <Button size="lg" variant="ink" asChild>
      <Link data-tour="list-add-gift" prefetch={false} href={href}>
        <Plus /> Add a gift
      </Link>
    </Button>
  )
}

/**
 * The top of your own list: the title, how many things are on it, the "Add a gift" button once
 * there is something, and the note about who sees what. Used by /gifts and by the marketing page.
 * It returns a fragment: the two pieces are spaced by the column they sit in.
 */
export function MyListHeader({
  count,
  addHref = "/gifts/new",
  headingLevel = "h1",
}: {
  count: number
  addHref?: string
  /** `p` where the page around it already has its `h1`. */
  headingLevel?: "h1" | "p"
}) {
  const subtitle = count === 0 ? "Nothing yet." : `${count} ${count === 1 ? "thing" : "things"} you'd love`
  const actions = count > 0 ? <AddGiftButton href={addHref} /> : undefined

  return (
    <>
      {headingLevel === "h1" ? (
        <PageHeader title="My list" subtitle={subtitle} actions={actions} />
      ) : (
        // PageHeader always renders its title as an h1, and its other callers rely on that. This is
        // its markup with a p for the title, class for class. Keep the two in step.
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="font-display text-3xl leading-tight font-(weight:--display-weight) tracking-(--display-tracking) break-words text-foreground sm:text-4xl">
              My list
            </p>
            <p className="mt-1.5 text-base text-muted-foreground">{subtitle}</p>
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-3 sm:shrink-0 sm:justify-end">{actions}</div> : null}
        </header>
      )}

      <p data-tour="list-note" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Eye className="size-4 shrink-0" aria-hidden />{" "}Your family sees this list. You&apos;ll never see who&apos;s getting what.
      </p>
    </>
  )
}
