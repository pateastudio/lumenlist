import { Gift } from "lucide-react"

/** The logo tile: a primary-colored rounded square with a gift. Colors come from theme tokens. */
export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
      style={{ width: size, height: size }}
    >
      <Gift style={{ width: size * 0.55, height: size * 0.55 }} strokeWidth={2.25} />
    </span>
  )
}

/** Up to two initials: first and last word ("Grandma Rose" -> "GR", "Mom" -> "M"). */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return "?"
  const first = Array.from(words[0])[0] ?? ""
  const last = words.length > 1 ? (Array.from(words[words.length - 1])[0] ?? "") : ""
  return (first + last).toUpperCase()
}

export const TONE_COUNT = 4

/** Stable tone (0..3, matching --tone-N-bg / --tone-N-fg) for an id. */
export function toneIndex(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return Math.abs(hash) % TONE_COUNT
}
