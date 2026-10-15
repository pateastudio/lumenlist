import Link from "next/link"
import { AuthFrame } from "@/components/auth/auth-frame"
import { LegalLine } from "@/components/legal/legal-line"
import { Button } from "@/components/ui/button"
import { Check, Gift, Lock } from "lucide-react"

const BULLETS = [
  { icon: Gift, text: "Make a list of things you'd love." },
  { icon: Check, text: "See everyone else's, and pick what you'll get them." },
  { icon: Lock, text: "Nobody sees who's getting what from their own list." },
]

/** Three short lines about how Lumen works, shown on the invite and join pages. */
export function HowLumenWorks() {
  return (
    <ul className="mt-6 space-y-3 text-left text-base">
      {BULLETS.map(({ icon: Icon, text }) => (
        <li key={text} className="flex gap-3">
          <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
          {text}
        </li>
      ))}
    </ul>
  )
}

/** A big emoji in a rounded tile, for pages without a person to show. */
export function EmojiTile({ emoji }: { emoji: string }) {
  return (
    <span aria-hidden className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-hero text-3xl">
      {emoji}
    </span>
  )
}

/** The two ways in for a signed-out visitor, keeping `next` so they land back on the invite. */
export function SignedOutChoices({ next }: { next: string }) {
  return (
    <div className="mt-7 space-y-2">
      <Button asChild variant="ink" size="lg" className="w-full">
        <Link href={`/signup?next=${encodeURIComponent(next)}`} prefetch={false}>
          Create my account
        </Link>
      </Button>
      <Button asChild variant="ghost" size="lg" className="w-full">
        <Link href={`/login?next=${encodeURIComponent(next)}`} prefetch={false}>
          I already have an account
        </Link>
      </Button>
      <LegalLine />
    </div>
  )
}

/** Friendly dead end for a link that doesn't work. Says what to do next. */
export function LinkProblem({
  title,
  children,
  action,
}: {
  title: string
  children: React.ReactNode
  action?: { href: string; label: string }
}) {
  return (
    <AuthFrame className="items-center text-center">
      <EmojiTile emoji="🔗" />
      <h1 className="mt-5 font-display text-3xl leading-tight font-(weight:--display-weight) tracking-(--display-tracking)">{title}</h1>
      <p className="mt-2 text-base text-muted-foreground">{children}</p>
      <Button asChild variant="ink" size="lg" className="mt-7 w-full">
        <Link href={action?.href ?? "/login"} prefetch={false}>
          {action?.label ?? "Go to sign in"}
        </Link>
      </Button>
    </AuthFrame>
  )
}
