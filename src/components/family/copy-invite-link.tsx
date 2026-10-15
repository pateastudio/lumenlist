"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function CopyInviteLink({ link, className }: { link: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(link)
    setCopied(true)
    toast.success("Link copied!")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button type="button" variant="ink" size="lg" className={cn("w-full sm:w-auto", className)} onClick={copy}>
      {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
      {copied ? "Copied!" : "Copy invite link"}
    </Button>
  )
}
