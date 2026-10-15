"use client"

import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"

// next-themes' useTheme returns different values server vs client (OS detection),
// causing React hydration error #418 on every page. Render client-only to avoid it.
const ToasterDynamic = dynamic(
  () => import("./sonner").then((m) => ({ default: m.Toaster })),
  { ssr: false }
)

// Signed-in pages have a fixed tab bar on phones (64px plus the iPhone home indicator): toasts sit
// above it, at every width, since Sonner's mobile layout starts below 600px and the tab bar shows
// up to 768px. Public pages have none, so toasts sit near the bottom edge.
const aboveTabBar = { bottom: "calc(5rem + env(safe-area-inset-bottom))" }
const nearBottom = { bottom: "calc(1rem + env(safe-area-inset-bottom))" }
export const SHELL = ["/dashboard", "/gifts", "/families", "/members", "/account"]

export function ToasterClient() {
  const pathname = usePathname()
  const offset = SHELL.some((p) => pathname === p || pathname.startsWith(p + "/")) ? aboveTabBar : nearBottom
  return <ToasterDynamic offset={offset} mobileOffset={offset} />
}
