import { Lock } from "lucide-react"
import { PersonAvatar } from "@/components/shared/person-avatar"

/**
 * The top of someone's list as their family sees it: who it is, how much is up for grabs, and the
 * note that they can't see any of it. Used by /members/[userId] and by the marketing page's phone.
 */
export function MemberListHeader({
  id,
  name,
  avatarUrl,
  shortName,
  giftCount,
  openCount,
  headingLevel = "h1",
}: {
  id: string
  name: string
  avatarUrl?: string | null
  /** What the page calls them in a sentence: "Maya" in "Maya's list". */
  shortName: string
  giftCount: number
  openCount: number
  /** `p` where the page around it already has its `h1`. */
  headingLevel?: "h1" | "p"
}) {
  const Heading = headingLevel

  return (
    <>
      <header className="mt-2 flex items-center gap-4">
        <PersonAvatar id={id} name={name} avatarUrl={avatarUrl} size="xl" className="shrink-0" />
        <div className="min-w-0">
          <Heading className="font-display text-3xl leading-tight font-(weight:--display-weight) tracking-(--display-tracking) break-words sm:text-4xl">
            {shortName}&apos;s list
          </Heading>
          <p className="mt-1 text-muted-foreground">
            {giftCount} {giftCount === 1 ? "gift" : "gifts"}
            {giftCount > 0 ? (
              <>
                {" · "}
                <strong className="text-foreground">{openCount} up for grabs</strong>
              </>
            ) : null}
          </p>
        </div>
      </header>

      <p data-tour="their-surprise-note" className="ink-card mt-5 flex items-center gap-3 rounded-xl bg-secondary p-4 text-sm text-secondary-foreground">
        <Lock className="size-5 shrink-0" aria-hidden />
        <span>
          <strong>{shortName} can&apos;t see any of this.</strong>{" "}
          Pick something, and we&apos;ll keep it a surprise.
        </span>
      </p>
    </>
  )
}
