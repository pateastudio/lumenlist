import Link from "next/link"
import { legalPublished } from "@/lib/legal/published"

const link = "font-semibold text-foreground underline underline-offset-4"

/** "By creating an account you agree to…", under a sign-up button. Nothing until the documents are published. */
export function LegalLine({ className }: { className?: string }) {
  if (!legalPublished()) return null
  return (
    <p className={className ?? "mt-4 text-center text-sm text-muted-foreground"}>
      By creating an account you agree to the{" "}
      <Link href="/terms" prefetch={false} className={link}>
        Terms
      </Link>{" "}
      and the{" "}
      <Link href="/privacy" prefetch={false} className={link}>
        Privacy Policy
      </Link>
      .
    </p>
  )
}
