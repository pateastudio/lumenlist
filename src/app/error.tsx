"use client"

import { useEffect } from "react"
import Link from "next/link"
import { CircleAlert } from "lucide-react"
import { BrandMark } from "@/components/shared/brand"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"

// Error boundary for pages outside the app shell (the root layout has no chrome).
export default function RootError({
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
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <BrandMark size={44} />
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
                <Link href="/dashboard">Go home</Link>
              </Button>
            </>
          }
        />
      </div>
    </div>
  )
}
