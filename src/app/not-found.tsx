import type { Metadata } from "next"
import Link from "next/link"
import { SearchX } from "lucide-react"
import { BrandMark } from "@/components/shared/brand"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = { title: "Page not found" }

// 404 outside the app shell. Centered on the cream background, like the auth frame.
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <BrandMark size={44} />
        <EmptyState
          icon={<SearchX />}
          title="We couldn't find that page"
          text="It may have moved, or the link may be out of date."
          actions={
            <Button asChild variant="ink" size="lg">
              <Link href="/dashboard">Go home</Link>
            </Button>
          }
        />
      </div>
    </div>
  )
}
