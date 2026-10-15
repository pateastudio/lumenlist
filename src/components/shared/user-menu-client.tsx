"use client"

import dynamic from "next/dynamic"

// Base UI's Menu.Trigger adds aria/data attributes only on the client,
// causing a React hydration mismatch (#418). Rendering client-only avoids it.
// next/dynamic with ssr:false is only allowed inside Client Components.
// The placeholder reserves the trigger's 44px circle so the header doesn't shift when the menu loads.
const UserMenuDynamic = dynamic(
  () => import("./user-menu").then((m) => ({ default: m.UserMenu })),
  { ssr: false, loading: () => <span aria-hidden className="block size-11 shrink-0 rounded-full bg-muted" /> }
)

interface UserMenuClientProps {
  userId: string
  name: string
  email: string
  avatarUrl: string | null
}

export function UserMenuClient(props: UserMenuClientProps) {
  return <UserMenuDynamic {...props} />
}
