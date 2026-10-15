import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { GiftForm } from "@/components/gifts/gift-form"
import { BackLink } from "@/components/shared/back-link"
import { PageHeader } from "@/components/shared/page-header"
import { getCurrentUser } from "@/lib/auth/user"

export const metadata: Metadata = { title: "Add a gift" }

export default async function NewGiftPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <BackLink href="/gifts">My list</BackLink>
        <PageHeader title="Add a gift" className="mt-1" />
      </div>
      <GiftForm />
    </div>
  )
}
