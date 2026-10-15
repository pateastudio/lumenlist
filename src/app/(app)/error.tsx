"use client"

import { useEffect } from "react"
import Link from "next/link"
import { CircleAlert } from "lucide-react"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"

// Error boundary for signed-in pages. Renders inside the app shell.
export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <EmptyState
      icon={<CircleAlert />}
      title="Something went wrong"
      text="It's not you. Try again, and if it keeps happening, email hello@pateastudio.com."
      actions={
        <>
          <Button variant="ink" size="lg" onClick={() => unstable_retry()}>
            Try again
          </Button>
          <Button asChild variant="ink-outline" size="lg">
            <Link prefetch={false} href="/dashboard">
              Go home
            </Link>
          </Button>
        </>
      }
    />
  )
}
