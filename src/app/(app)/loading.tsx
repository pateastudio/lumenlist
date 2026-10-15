import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

// Shown while a signed-in page loads. Shaped like PageHeader (title and subtitle) and the
// card grid the list pages use. The app shell stays rendered around it.
export default function AppLoading() {
  return (
    <div aria-live="polite" className="flex flex-col gap-8">
      <div role="status" className="flex flex-col gap-8">
        <span className="sr-only">Loading…</span>
        <div className="flex flex-col gap-3" aria-hidden>
          <Skeleton className="h-10 w-2/3 max-w-sm" />
          <Skeleton className="h-5 w-1/2 max-w-xs" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-hidden>
          {[0, 1, 2].map((i) => (
            <Card key={i} variant="ink" className="gap-3 p-4">
              <Skeleton className="aspect-[4/3] w-full" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
