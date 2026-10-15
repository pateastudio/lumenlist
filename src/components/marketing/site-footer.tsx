import Link from "next/link"
import { BrandMark } from "@/components/shared/brand"
import { cn } from "@/lib/utils"

const focus = "rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring"
const footerLink = cn("flex min-h-11 items-center font-semibold underline underline-offset-4", focus)

/** `legal` shows the Privacy and Terms links and the copyright line, once those pages are published. */
export function SiteFooter({ legal }: { legal: boolean }) {
  return (
    <footer className="border-t-(length:--ink-width) border-border-strong">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-6 text-base sm:px-6">
        <p className="flex items-center gap-2.5 font-semibold">
          <BrandMark size={28} />
          Lumen · made for families
        </p>
        <p className="text-muted-foreground">Surprises stay secret.</p>
        {legal && (
          <>
            <Link href="/privacy" prefetch={false} className={footerLink}>
              Privacy
            </Link>
            <Link href="/terms" prefetch={false} className={footerLink}>
              Terms
            </Link>
          </>
        )}
        <Link href="/login" prefetch={false} className={footerLink}>
          Sign in
        </Link>
      </div>
      {legal && <p className="mx-auto w-full max-w-6xl px-4 pb-6 text-sm text-muted-foreground sm:px-6">© 2026 Patea LLC</p>}
    </footer>
  )
}
