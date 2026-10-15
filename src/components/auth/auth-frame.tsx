import Link from "next/link"
import { CircleAlert } from "lucide-react"
import { Card } from "@/components/ui/card"
import { BrandMark } from "@/components/shared/brand"
import { cn } from "@/lib/utils"

/**
 * The signed-out page frame: cream background, the logo, and an ink card holding the content.
 * Top-aligned (not vertically centered) so the submit button stays reachable with the phone
 * keyboard open.
 */
export function AuthFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center bg-background px-4 py-8 sm:py-14">
      {/* Back to the front page. Someone already signed in lands on Home: the proxy sends them on. */}
      <Link
        href="/"
        prefetch={false}
        className="flex min-h-11 items-center gap-2.5 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <BrandMark size={40} />
        <span className="font-display text-2xl font-(weight:--display-weight) tracking-(--display-tracking)">Lumen</span>
      </Link>
      <Card variant="ink" className={cn("mt-6 w-full max-w-md gap-0 p-6 sm:p-8", className)}>
        {children}
      </Card>
    </div>
  )
}

/** The page title and its short friendly subtitle, inside the card. */
export function AuthHeading({ title, subtitle }: { title: React.ReactNode; subtitle?: React.ReactNode }) {
  return (
    <div className="mb-6 text-center">
      <h1 className="font-display text-3xl leading-tight font-(weight:--display-weight) tracking-(--display-tracking)">{title}</h1>
      {subtitle ? <p className="mt-2 text-base text-muted-foreground">{subtitle}</p> : null}
    </div>
  )
}

/** One inline error, announced to screen readers. Each error is shown here and nowhere else. */
export function AuthError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm font-medium text-destructive">
      {/* An icon as well as color: Patea's danger color is close to its text color. */}
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </p>
  )
}
