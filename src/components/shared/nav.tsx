import Link from "next/link"
import type { Profile } from "@/types"
import { BrandMark } from "./brand"
import { NavTabs } from "./nav-tabs"
import { UserMenuClient } from "./user-menu-client"

// The (app) layout loads the profile, so components never query the database themselves.
// Phones get the tabs as a fixed bottom bar; from md up they sit in the header (see NavTabs).
export function Nav({ userId, profile }: { userId: string; profile: Pick<Profile, "name" | "email" | "avatar_url"> | null }) {
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-card">
        <div className="mx-auto flex h-16 w-full max-w-[1120px] items-center justify-between gap-4 px-4 md:px-8">
          <div className="flex items-center gap-8">
            <Link
              prefetch={false}
              href="/dashboard"
              className="flex items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <BrandMark size={36} />
              <span className="font-display text-xl font-(weight:--display-weight) tracking-(--display-tracking) text-foreground">Lumen</span>
            </Link>
            <NavTabs variant="header" />
          </div>
          <UserMenuClient
            userId={userId}
            name={profile?.name ?? ""}
            email={profile?.email ?? ""}
            avatarUrl={profile?.avatar_url ?? null}
          />
        </div>
      </header>
      <NavTabs variant="bar" />
    </>
  )
}
