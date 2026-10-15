import type { Metadata } from "next"
import Link from "next/link"
import { ArrowDown } from "lucide-react"
import { Blanket } from "@/components/marketing/blanket"
import { CoverCard } from "@/components/marketing/cover-card"
import { FREE_LINE, INVITE_LINE_LEAD, INVITE_LINE_REST, SITE_DESCRIPTION } from "@/components/marketing/copy"
import { DemoFamily } from "@/components/marketing/demo/demo-family"
import { PEOPLE } from "@/components/marketing/demo/family"
import styles from "@/components/marketing/marketing.module.css"
import { SiteFooter } from "@/components/marketing/site-footer"
import { SiteHeader } from "@/components/marketing/site-header"
import { Steps } from "@/components/marketing/steps"
import { PersonAvatar } from "@/components/shared/person-avatar"
import { Button } from "@/components/ui/button"
import { legalPublished } from "@/lib/legal/published"
import { cn } from "@/lib/utils"

const TITLE = "Lumen: gift lists for your family"

// The description comes from the root layout, and the social card's picture from
// src/app/opengraph-image.png. The page reads nothing, so it is built once.
export const metadata: Metadata = {
  title: { absolute: TITLE },
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: "Lumen", url: "/", title: TITLE, description: SITE_DESCRIPTION },
}

const display = "font-display font-(weight:--display-weight) tracking-(--display-tracking)"
const focus = "rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring"
const h2 = cn(display, "text-4xl leading-[1.04] text-balance sm:text-5xl lg:text-6xl")
const sticker = "rounded-full border-(length:--ink-width) border-border-strong shadow-button"

const OCCASIONS = [
  { label: "Birthdays", emoji: "🎂", tone: "bg-tone-0-bg text-tone-0-fg", r: "-4deg" },
  { label: "Christmas", emoji: "🎄", tone: "bg-tone-2-bg text-tone-2-fg", r: "3deg" },
  { label: "Hanukkah", emoji: "🕎", tone: "bg-tone-3-bg text-tone-3-fg", r: "-2deg" },
  { label: "Baby showers", emoji: "🍼", tone: "bg-card text-card-foreground", r: "5deg" },
  { label: "Graduations", emoji: "🎓", tone: "bg-tone-1-bg text-tone-1-fg", r: "-3deg" },
  { label: "Mother's Day", emoji: "💐", tone: "bg-tone-0-bg text-tone-0-fg", r: "2deg" },
  { label: "Just because", emoji: "💛", tone: "bg-hero text-foreground", r: "-4deg" },
] as const

function InviteLine({ className }: { className?: string }) {
  return (
    <p className={cn("text-base leading-relaxed", className)}>
      <strong>{INVITE_LINE_LEAD}</strong> {INVITE_LINE_REST}
    </p>
  )
}

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <DemoFamily>
        <main id="main" className="flex-1 overflow-x-clip">
          {/* Room one: the quiet cover */}
          <section aria-labelledby="cover-title" className="mx-auto w-full max-w-6xl px-4 pt-4 pb-14 sm:px-6 lg:pt-14 lg:pb-24">
            <div className="grid items-center gap-x-16 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <div>
                <p className="flex items-center gap-3 text-sm font-bold tracking-[0.16em] text-primary uppercase">
                  <span className="h-0.5 w-8 bg-primary" aria-hidden />
                  Gift lists for families
                </p>
                <h1 id="cover-title" className={cn(display, "mt-4 text-[2.4rem] leading-[1] min-[360px]:text-[2.9rem] sm:text-7xl lg:text-[5rem] xl:text-[5.75rem]")}>
                  A little list.
                  <br />
                  <span className="whitespace-nowrap">
                    A big <span className={styles.marker}>surprise.</span>
                  </span>
                </h1>
                <p className="mt-5 max-w-[34ch] text-[1.2rem] leading-relaxed text-foreground/85 lg:text-2xl lg:leading-relaxed">
                  Lumen helps your family give each other things they&apos;ll really love, without spoiling a thing.
                </p>
                <div className="mt-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-5 lg:mt-8">
                  <Button asChild variant="ink" size="lg" className="h-14 w-full px-7 text-lg sm:w-auto">
                    <Link href="/signup" prefetch={false}>
                      Start your family&apos;s list
                    </Link>
                  </Button>
                  <Link
                    href="/login"
                    prefetch={false}
                    className={cn("flex min-h-12 items-center justify-center px-2 text-base font-semibold underline underline-offset-4", focus)}
                  >
                    I already have an account
                  </Link>
                </div>
                <InviteLine className="mt-2 max-w-md text-muted-foreground [&_strong]:text-foreground lg:mt-4" />
              </div>
              <CoverCard />
            </div>
          </section>

          {/* Room two: the blanket */}
          <section id="blanket" aria-labelledby="blanket-title" className={cn(styles.gingham, "z-10 scroll-mt-4")}>
            <span className={styles.fringeTop} aria-hidden />
            <span className={styles.fringeBottom} aria-hidden />

            {/* Sits on the hem, so the first screen says there is something to play with just below. */}
            <a
              href="#blanket"
              className={cn(
                sticker,
                "absolute -top-6 left-1/2 z-10 inline-flex min-h-12 -translate-x-1/2 -rotate-2 items-center gap-2 bg-card py-1 pr-5 pl-1.5 font-display text-base font-(weight:--display-weight) whitespace-nowrap focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none lg:right-[max(1.5rem,calc(50%-34rem))] lg:left-auto lg:translate-x-0",
              )}
            >
              <span className={cn(styles.pulse, "grid size-9 place-items-center rounded-full border-(length:--ink-width) border-border-strong bg-hero")}>
                <ArrowDown className="size-4" strokeWidth={3} aria-hidden />
              </span>
              Come and play
            </a>

            <div className="relative z-[1] mx-auto w-full max-w-6xl px-4 pt-14 pb-16 sm:px-6 lg:pt-20 lg:pb-14">
              <div className="text-center lg:max-w-2xl lg:text-left">
                <h2 id="blanket-title" className={h2}>
                  Go on. Help yourself.
                </h2>
                <p className="mx-auto mt-3 max-w-[30ch] text-lg leading-relaxed text-foreground/85 lg:mx-0 lg:max-w-none lg:text-xl">
                  Meet the Harpers. Pick a gift for Nora and watch where it lands.
                </p>
              </div>
              <div className="mt-7 flex justify-center lg:mt-12">
                <Blanket />
              </div>
            </div>

            {/* Carries from the blanket into the steps. */}
            <p
              aria-hidden
              className={cn(
                sticker,
                "absolute -bottom-6 left-1/2 z-10 flex -translate-x-1/2 rotate-2 items-center gap-2.5 bg-card py-1.5 pr-5 pl-1.5 font-display text-base leading-none font-(weight:--display-weight) whitespace-nowrap lg:left-[62%]",
              )}
            >
              <PersonAvatar id={PEOPLE.nora.id} name={PEOPLE.nora.name} size="md" />
              Next: Nora&apos;s list, step by step
            </p>
          </section>

          {/* Room three: four steps on the phone */}
          <section id="steps" aria-labelledby="steps-title" className="mx-auto w-full max-w-6xl scroll-mt-4 px-4 pt-20 sm:px-6 lg:pt-28">
            <Steps
              intro={
                <>
                  <h2 id="steps-title" className={h2}>
                    How it works, in four steps.
                  </h2>
                  <p className="mt-3 max-w-[36ch] text-lg leading-relaxed text-muted-foreground lg:text-xl">
                    Same family, this time on a phone, the way you&apos;d really use it. Keep scrolling and watch the screen.
                  </p>
                </>
              }
            />
          </section>

          {/* Occasions: a short strip */}
          <section id="occasions" aria-labelledby="days-title" className="mx-auto w-full max-w-6xl px-4 pt-6 pb-16 sm:px-6 lg:pt-10 lg:pb-24">
            <div className="border-t-2 border-dashed border-foreground/30 pt-12 text-center lg:pt-16">
              <h2 id="days-title" className={cn(display, "text-3xl leading-tight text-balance sm:text-4xl")}>
                One list, all year round.
              </h2>
              <p className="mx-auto mt-3 max-w-[40ch] text-lg leading-relaxed text-muted-foreground">
                Shared with every family you&apos;re part of. Yours, your in-laws, all of them.
              </p>
              <ul className="mx-auto mt-8 flex max-w-4xl flex-wrap justify-center gap-x-2.5 gap-y-4 sm:gap-x-4">
                {OCCASIONS.map((o) => (
                  <li
                    key={o.label}
                    className={cn(
                      styles.sticker,
                      sticker,
                      "inline-flex min-h-11 items-center gap-1.5 px-4 font-display text-base font-(weight:--display-weight-soft) sm:min-h-12 sm:px-5 sm:text-lg",
                      o.tone,
                    )}
                    style={{ "--r": o.r } as React.CSSProperties}
                  >
                    <span aria-hidden className="text-xl">
                      {o.emoji}
                    </span>
                    {o.label}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Closing: back on the blanket */}
          <section aria-labelledby="close-title" className={cn(styles.gingham, styles.ginghamEnd)}>
            <span className={styles.fringeTop} aria-hidden />
            <div className="relative z-[1] mx-auto w-full max-w-3xl px-6 py-16 text-center text-foreground lg:py-24">
              <h2 id="close-title" className={cn(display, "mx-auto max-w-[13ch] text-5xl leading-none text-balance sm:text-6xl lg:text-7xl")}>
                Your family&apos;s lists are waiting.
              </h2>
              <p className="mx-auto mt-5 max-w-[30ch] text-xl leading-relaxed text-foreground/85">{FREE_LINE}</p>
              <div className="mt-7 flex flex-col items-center gap-1">
                <Button asChild variant="ink" size="lg" className="h-14 w-full max-w-xs px-7 text-lg">
                  <Link href="/signup" prefetch={false}>
                    Start your family&apos;s list
                  </Link>
                </Button>
                <Link href="/login" prefetch={false} className={cn("flex min-h-12 items-center px-2 text-base font-semibold underline underline-offset-4", focus)}>
                  I already have an account
                </Link>
              </div>
              <InviteLine className="mx-auto mt-2 max-w-md text-foreground/85" />
            </div>
          </section>
        </main>
      </DemoFamily>
      <SiteFooter legal={legalPublished()} />
    </>
  )
}
