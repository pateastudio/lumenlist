import type { Metadata } from "next"
import { LegalDocument } from "@/components/legal/legal-document"

export const metadata: Metadata = { title: "Privacy Policy" }
// Built once: the text comes from a file in the repo, not from a request.
export const dynamic = "force-static"

export default function PrivacyPage() {
  return <LegalDocument which="privacy" />
}
