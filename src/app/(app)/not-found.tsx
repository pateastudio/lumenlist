import type { Metadata } from "next"
import Link from "next/link"
import { SearchX } from "lucide-react"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = { title: "Page not found" }

// 404 inside the app shell (for example an unknown member or family id).
export default function AppNotFound() {
  return (
    <EmptyState
      icon={<SearchX />}
      title="We couldn't find that page"
      text="It may have moved, or the link may be out of date. Your families are one tap away."
      actions={
        <>
          <Button asChild variant="ink" size="lg">
            <Link prefetch={false} href="/dashboard">
              Go home
            </Link>
          </Button>
          <Button asChild variant="ink-outline" size="lg">
            <Link prefetch={false} href="/families">
              See your families
            </Link>
          </Button>
        </>
      }
    />
  )
}
