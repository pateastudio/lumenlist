import Link from "next/link"
import { BrandMark } from "@/components/shared/brand"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const display = "font-display font-(weight:--display-weight) tracking-(--display-tracking)"
const focus = "rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring"

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:py-4">
      <Link href="/" prefetch={false} className={cn("flex min-h-11 items-center gap-2.5", focus)}>
        <BrandMark size={36} />
        <span className={cn(display, "text-2xl")}>Lumen</span>
      </Link>
      <nav aria-label="Account" className="flex items-center gap-0 sm:gap-3">
        <Link href="/login" prefetch={false} className={cn("flex min-h-11 items-center px-2 text-base font-semibold whitespace-nowrap underline-offset-4 sm:px-3 hover:underline", focus)}>
          Sign in
        </Link>
        <Button asChild variant="ink" className="h-11 px-3 text-sm sm:px-4 sm:text-base">
          <Link href="/signup" prefetch={false}>
            Start a list
          </Link>
        </Button>
      </nav>
    </header>
  )
}
