import type { Metadata } from "next"
import { CreateFamilyForm } from "@/components/family/create-family-form"
import { BackLink } from "@/components/shared/back-link"
import { PageHeader } from "@/components/shared/page-header"

export const metadata: Metadata = { title: "Create a family" }

export default function NewFamilyPage() {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="space-y-2">
        <BackLink href="/families">Your families</BackLink>
        <PageHeader title="Create a family" subtitle="Name your family, then invite everyone with a link." />
      </div>
      <CreateFamilyForm />
    </div>
  )
}
