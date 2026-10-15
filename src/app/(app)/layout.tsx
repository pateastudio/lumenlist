import { redirect } from "next/navigation"
import { TourProvider } from "@/components/onboarding/tour-provider"
import { Nav } from "@/components/shared/nav"
import { getCurrentUser } from "@/lib/auth/user"
import { withUser } from "@/lib/db/with-user"
import { getTour } from "@/lib/data/onboarding"
import { getProfile } from "@/lib/data/profiles"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }
  // One transaction, one query after another. For someone who has finished the tour, getTour is
  // a single primary-key read.
  const { profile, tour } = await withUser(user.id, async (tx) => {
    const profile = await getProfile(tx, user.id)
    const tour = await getTour(tx, user.id, profile?.name?.trim() || user.name)
    return { profile, tour }
  })

  return (
    <TourProvider info={tour}>
      <div className="flex min-h-screen flex-col bg-background">
        <Nav userId={user.id} profile={profile} />
        {/* Bottom padding clears the phone tab bar (64px + the home-indicator inset). */}
        <main className="mx-auto w-full max-w-[1120px] flex-1 px-4 pt-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:px-8 md:pt-9 md:pb-16">
          {children}
        </main>
      </div>
    </TourProvider>
  )
}
