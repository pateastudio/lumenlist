"use client"

import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth/client"

export function SignOutButton() {
  const router = useRouter()

  async function signOut() {
    await authClient.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <Button variant="ink-outline" size="lg" className="w-full" onClick={signOut}>
      <LogOut aria-hidden /> Sign out
    </Button>
  )
}
