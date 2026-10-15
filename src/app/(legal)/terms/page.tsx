import type { Metadata } from "next"
import { LegalDocument } from "@/components/legal/legal-document"

export const metadata: Metadata = { title: "Terms of Service" }
// Built once: the text comes from a file in the repo, not from a request.
export const dynamic = "force-static"

export default function TermsPage() {
  return <LegalDocument which="terms" />
}
