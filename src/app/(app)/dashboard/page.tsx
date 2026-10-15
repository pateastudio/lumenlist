import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ChevronRight, Plus, ShoppingBag, Sparkles, Users } from "lucide-react"
import { DashboardGreeting } from "@/components/dashboard/dashboard-greeting"
import { WelcomeEyebrow } from "@/components/dashboard/welcome-eyebrow"
import { MarkBoughtButton } from "@/components/dashboard/mark-bought-button"
import { ShoppingCard, type ShoppingRow } from "@/components/dashboard/shopping-card"
import { EmptyState } from "@/components/shared/empty-state"
import { PersonAvatar } from "@/components/shared/person-avatar"
import { buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { getCurrentUser } from "@/lib/auth/user"
import { withUser } from "@/lib/db/with-user"
import { getProfile } from "@/lib/data/profiles"
import { fellowMembers, listMyFamilies } from "@/lib/data/families"
import { listOwnGifts } from "@/lib/data/gifts"
import { recentClaimsBy } from "@/lib/data/claims"
import { formatPrice, shortName } from "@/lib/format"

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export const metadata: Metadata = { title: "Home" }

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  // One transaction for the whole page; the queries run on its connection one after another.
  const [profile, families, myGifts, claims, fellows] = await withUser(user.id, (tx) =>
    Promise.all([
      getProfile(tx, user.id),
      listMyFamilies(tx, user.id),
      listOwnGifts(tx, user.id),
      recentClaimsBy(tx, user.id, 20),
      fellowMembers(tx, user.id, 50),
    ]),
  )
  const fallbackName = (user.name.trim() && shortName(user.name)) || user.email.split("@")[0] || "there"
  const firstName = (profile?.name?.trim() && shortName(profile.name)) || fallbackName
  const giftCount = myGifts.length

  // fellowMembers returns one row per family a person shares with you; show each person once.
  const seen = new Set<string>()
  const people = fellows.filter((m) => !seen.has(m.user_id) && seen.add(m.user_id))
  const nameById = new Map(people.map((p) => [p.user_id, p.profiles?.name ?? ""]))

  const boughtCount = claims.filter((c) => c.status === "purchased").length
  const toBuy = claims.length - boughtCount

  const shoppingRows: ShoppingRow[] = claims.map((c) => {
    const title = c.gifts?.title ?? "Gift"
    const owner = c.gifts?.owner_id ? nameById.get(c.gifts.owner_id) : ""
    const price = formatPrice(c.gifts?.price)
    const detail = [owner ? `for ${owner}` : null, price].filter(Boolean).join(" · ")
    const bought = c.status === "purchased"
    return { id: c.id, title, detail, bought, action: bought ? undefined : <MarkBoughtButton giftId={c.gift_id} title={title} /> }
  })

  const summary = [
    giftCount === 0
      ? "Your list is empty. Add a few things you'd love."
      : `${plural(giftCount, "thing", "things")} on your list.`,
    claims.length === 0
      ? families.length > 0
        ? "You're not shopping for anyone yet."
        : ""
      : toBuy === 0
        ? "Everything you claimed is bought."
        : `You're shopping for ${plural(toBuy, "more gift", "more gifts")}.`,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <div className="space-y-6 pt-2">
      <section data-tour="home-hero" className="relative overflow-hidden rounded-xl bg-hero p-6 text-foreground ink-card sm:p-10">
        <WelcomeEyebrow />
        <DashboardGreeting firstName={firstName} />
        <p className="mt-3 max-w-md text-base text-foreground/80">{summary}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link data-tour="home-add-gift" prefetch={false} href="/gifts/new" className={buttonVariants({ variant: "ink", size: "lg" })}>
            <Plus /> Add a gift
          </Link>
          <Link data-tour="home-see-list" prefetch={false} href="/gifts" className={buttonVariants({ variant: "ink-outline", size: "lg" })}>
            See my list
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section data-tour="home-shopping" className="min-w-0">
          {claims.length === 0 ? (
            <EmptyState
              icon={<ShoppingBag />}
              title="You're not shopping for anyone yet"
              text={
                families.length === 0
                  ? "Join or create a family, then claim a gift from someone's list."
                  : "Open a family member's list and tap \"I'll get this\" so nobody doubles up."
              }
              actions={
                <Link
                  prefetch={false}
                  href={families.length === 0 ? "/families/new" : "/families"}
                  className={buttonVariants({ variant: "ink", size: "lg" })}
                >
                  {families.length === 0 ? "Create a family" : "Browse lists"}
                </Link>
              }
            />
          ) : (
            <ShoppingCard rows={shoppingRows} />
          )}
        </section>

        <div className="min-w-0 space-y-6">
          <Card data-tour="home-people" variant="ink" className="gap-0 p-5">
            <h2 className="font-display text-2xl font-(weight:--display-weight)">Your people</h2>
            {people.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {families.length === 0
                  ? "Create or join a family to see everyone's lists here."
                  : "You're the only one here so far. Invite someone from your family page."}
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Tap someone to see their list.</p>
                <ul data-scroll-x className="-mx-1 mt-4 flex gap-3 overflow-x-auto px-1 pb-1">
                  {people.map((p) => {
                    const name = p.profiles?.name || "Unknown"
                    return (
                      <li key={p.user_id} className="w-[4.5rem] shrink-0">
                        <Link
                          prefetch={false}
                          href={`/members/${p.user_id}?familyId=${p.family_id}`}
                          className="flex min-h-11 flex-col items-center gap-1.5 rounded-lg text-center focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
                        >
                          <PersonAvatar id={p.user_id} name={name} size="lg" />
                          <span className="line-clamp-2 text-xs leading-tight font-semibold">{shortName(name)}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </>
            )}
          </Card>

          {families.length === 0 ? (
            <EmptyState
              icon={<Users />}
              title="No family yet"
              text="Create a family and invite people to share gift lists."
              actions={
                <Link prefetch={false} href="/families/new" className={buttonVariants({ variant: "ink", size: "lg" })}>
                  Create your first family
                </Link>
              }
            />
          ) : (
            families.map((f) => {
              // This family's own people: `fellows` has a row per person per family you share.
              const members = fellows.filter((m) => m.family_id === f.id)
              return (
              <Link key={f.id} prefetch={false} href={`/families/${f.id}`} className="block rounded-xl focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none">
                <Card variant="ink" className="flex-row items-center gap-4 p-5">
                  <div className="flex -space-x-3">
                    {members.slice(0, 3).map((p) => (
                      <PersonAvatar key={p.user_id} id={p.user_id} name={p.profiles?.name || "Unknown"} size="md" className="ring-2 ring-card" />
                    ))}
                    {members.length === 0 ? (
                      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Users className="size-5" />
                      </span>
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{f.name}</p>
                    <p className="text-sm text-muted-foreground">{plural(f.member_count, "person", "people")}</p>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                </Card>
              </Link>
              )
            })
          )}

          <Card data-tour="home-surprise" className="flex-row gap-3 bg-secondary p-5 text-secondary-foreground">
            <Sparkles className="mt-0.5 size-5 shrink-0" />
            <p className="text-sm">
              <strong>Surprises stay secret.</strong>{" "}Nobody can see who&apos;s getting what from their own list, not even you.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
