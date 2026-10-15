import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { initials, toneIndex } from "./brand"

const SIZES = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
  xl: "size-20 text-2xl",
} as const

// Static strings so Tailwind sees them; index matches --tone-N-bg / --tone-N-fg.
const TONES = [
  "bg-tone-0-bg text-tone-0-fg",
  "bg-tone-1-bg text-tone-1-fg",
  "bg-tone-2-bg text-tone-2-fg",
  "bg-tone-3-bg text-tone-3-fg",
] as const

export type PersonAvatarProps = {
  id: string
  name: string
  avatarUrl?: string | null
  size?: keyof typeof SIZES
  className?: string
}

/** The person's picture, or their initials in a tone picked from their id (the same every time). */
export function PersonAvatar({ id, name, avatarUrl, size = "md", className }: PersonAvatarProps) {
  return (
    <Avatar className={cn(SIZES[size], "after:hidden", className)}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
      <AvatarFallback
        className={cn("font-display font-(weight:--display-weight-soft) group-data-[size=sm]/avatar:text-xs", TONES[toneIndex(id)])}
        aria-label={avatarUrl ? undefined : name}
      >
        <span aria-hidden>{initials(name)}</span>
      </AvatarFallback>
    </Avatar>
  )
}
