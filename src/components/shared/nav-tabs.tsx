"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Gift, House, Users } from "lucide-react"
import { cn } from "@/lib/utils"

type TabId = "home" | "mine" | "family"

const TABS: { id: TabId; href: string; label: string; icon: typeof House }[] = [
  { id: "home", href: "/dashboard", label: "Home", icon: House },
  { id: "mine", href: "/gifts", label: "My list", icon: Gift },
  { id: "family", href: "/families", label: "Family", icon: Users },
]

/** Which tab a path belongs to. Someone's list (/members/*) sits under Family; /account has none. */
export function activeTab(pathname: string): TabId | null {
  const is = (base: string) => pathname === base || pathname.startsWith(base + "/")
  if (is("/dashboard")) return "home"
  if (is("/gifts")) return "mine"
  if (is("/families") || is("/members")) return "family"
  return null
}

const focus =
  "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"

/** The three main tabs. "header" is the row of pills for wide screens; "bar" is the phone bottom bar. */
export function NavTabs({ variant }: { variant: "header" | "bar" }) {
  const active = activeTab(usePathname())

  if (variant === "header") {
    return (
      <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
        {TABS.map((t) => (
          <Link
            key={t.id}
            data-tour={`tab-${t.id}`}
            prefetch={false}
            href={t.href}
            aria-current={t.id === active ? "page" : undefined}
            className={cn(
              "flex h-11 items-center gap-2 rounded-full px-4 text-[15px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              focus,
              t.id === active && "bg-secondary text-secondary-foreground hover:bg-secondary",
            )}
          >
            <t.icon className="size-4" aria-hidden />
            {t.label}
          </Link>
        ))}
      </nav>
    )
  }

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {TABS.map((t) => (
        <Link
          key={t.id}
          data-tour={`tab-${t.id}`}
          prefetch={false}
          href={t.href}
          aria-current={t.id === active ? "page" : undefined}
          className={cn(
            "flex h-16 flex-col items-center justify-center gap-1 text-xs font-(weight:--label-weight) text-muted-foreground transition-colors",
            "focus-visible:ring-inset",
            focus,
            t.id === active && "text-primary",
          )}
        >
          <t.icon className="size-6" strokeWidth={t.id === active ? 2.5 : 2} aria-hidden />
          {t.label}
        </Link>
      ))}
    </nav>
  )
}
