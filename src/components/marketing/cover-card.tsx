import { TheirGiftCard } from "@/components/gifts/their-gift-card"
import { PersonAvatar } from "@/components/shared/person-avatar"
import { cn } from "@/lib/utils"
import { GIFT, initialGifts, PEOPLE, VIEWER } from "./demo/family"
import styles from "./marketing.module.css"

function Star({ className, primary = false }: { className?: string; primary?: boolean }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <path
        className={cn(styles.inkStar, primary && styles.inkStarPrimary)}
        d="M20 3c1.6 9 5.4 13.400 17 17-11.600 3.600-15.400 8-17 17-1.600-9-5.400-13.400-17-17 11.600-3.600 15.400-8 17-17z"
      />
    </svg>
  )
}

/** The cover's one picture: the real card for Nora's tulips, as her family first finds it. A picture, so it is inert. */
export function CoverCard() {
  const tulips = initialGifts().find((g) => g.id === GIFT.tulips)
  if (!tulips) return null
  return (
    <div className="relative mx-auto hidden w-full max-w-[21rem] lg:block" aria-hidden>
      <Star className="absolute -top-8 -left-8 z-10 size-11" />
      <Star primary className="absolute top-28 -right-8 z-10 size-7" />
      <div className={styles.float} style={{ "--rot": "3deg" } as React.CSSProperties}>
        <div inert className="pr-1.5 pb-1.5">
          <TheirGiftCard gift={{ ...tulips, gift_claims: null }} currentUserId={VIEWER.id} ownerName="Nora" />
        </div>
      </div>
      <div className="ink-card absolute -top-12 -right-5 z-10 flex -rotate-4 items-center gap-2.5 rounded-full bg-card py-1.5 pr-4 pl-1.5">
        <PersonAvatar id={PEOPLE.nora.id} name={PEOPLE.nora.name} size="md" />
        <span className="font-display text-base leading-none font-(weight:--display-weight)">Nora&apos;s list</span>
      </div>
    </div>
  )
}
