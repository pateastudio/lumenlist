"use client"

import { useRouter } from "next/navigation"
import { LogOut, Plus, Settings } from "lucide-react"
import { authClient } from "@/lib/auth/client"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PersonAvatar } from "./person-avatar"

interface UserMenuProps {
  userId: string
  name: string
  email: string
  avatarUrl: string | null
}

export function UserMenu({ userId, name, email, avatarUrl }: UserMenuProps) {
  const router = useRouter()

  async function signOut() {
    await authClient.signOut()
    router.push("/login")
    router.refresh()
  }

  const shownName = name || email

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-tour="user-menu"
        aria-label="User menu"
        className="flex size-11 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <PersonAvatar id={userId} name={shownName} avatarUrl={avatarUrl} size="md" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-60 min-w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5 px-2 py-2">
            <span className="truncate text-sm font-semibold text-foreground">{shownName}</span>
            {name ? <span className="truncate text-xs text-muted-foreground">{email}</span> : null}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {/* Base UI items don't support asChild, so navigate with router.push. */}
        <DropdownMenuItem className="min-h-11 px-2 text-sm" onClick={() => router.push("/account")}>
          <Settings /> Account
        </DropdownMenuItem>
        <DropdownMenuItem className="min-h-11 px-2 text-sm" onClick={() => router.push("/families/new")}>
          <Plus /> Create a family
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" className="min-h-11 px-2 text-sm" onClick={signOut}>
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
