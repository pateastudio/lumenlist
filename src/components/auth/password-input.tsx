"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/**
 * A password field with a show/hide toggle. The toggle's label doesn't contain the word
 * "password", so labelled lookups of the field itself stay unambiguous.
 */
export function PasswordInput({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  const [shown, setShown] = useState(false)
  return (
    <div className="relative">
      <Input type={shown ? "text" : "password"} className={cn("h-12 pr-12 text-base md:text-base", className)} {...props} />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-label="Show characters"
        aria-pressed={shown}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-lg text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
      >
        {shown ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
      </button>
    </div>
  )
}
