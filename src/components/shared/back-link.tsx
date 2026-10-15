import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

type BackLinkProps = {
  href: string
  children: React.ReactNode
  className?: string
}

/** A 44px-tall "back" link with an arrow. */
export function BackLink({ href, children, className }: BackLinkProps) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={cn(
        "-ml-2 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
        className
      )}
    >
      <ArrowLeft className="size-4" aria-hidden />
      {children}
    </Link>
  )
}
