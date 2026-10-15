import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ChevronRight, Plus, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { getCurrentUser } from "@/lib/auth/user"
import { withUser } from "@/lib/db/with-user"
import { listMyFamilies } from "@/lib/data/families"

export const metadata: Metadata = { title: "Your families" }

export default async function FamiliesPage() {
  const user = await getCurrentUser()

  if (!user) redirect("/login")

  const families = await withUser(user.id, (tx) => listMyFamilies(tx, user.id))

  const createButton = (
    <Button
      variant="ink"
      size="lg"
      className="w-full sm:w-auto"
      asChild
    >
      <Link prefetch={false} href="/families/new">
        <Plus aria-hidden />
        Create a family
      </Link>
    </Button>
  )

  return (
    <div className="space-y-6">
      <PageHeader title="Your families" actions={createButton} />

      {families.length === 0 ? (
        <EmptyState
          icon={<Users aria-hidden />}
          title="No families yet"
          text="You haven't joined any families yet. Create one, or open an invite link someone sent you."
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {families.map((family) => {
            const isOwner = family.created_by === user.id
            return (
              <li key={family.id}>
                <Card variant="ink" className="relative min-h-24 flex-row items-center gap-4 p-4 hover:bg-muted">
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-hero text-foreground">
                    <Users className="size-6" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-display text-xl font-(weight:--display-weight-soft)">
                      <Link
                        prefetch={false}
                        href={`/families/${family.id}`}
                        className="after:absolute after:inset-0 focus-visible:outline-none"
                      >
                        {family.name}
                      </Link>
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {family.member_count} {family.member_count === 1 ? "person" : "people"}
                      {isOwner ? " · Owner" : ""}
                    </p>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
