import Image from "next/image"
import { Gift as GiftIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { toneIndex } from "./brand"

const RATIOS = {
  square: "aspect-square",
  video: "aspect-video",
  "4/3": "aspect-[4/3]",
  "3/2": "aspect-[3/2]",
} as const

const TONES = [
  "bg-tone-0-bg text-tone-0-fg",
  "bg-tone-1-bg text-tone-1-fg",
  "bg-tone-2-bg text-tone-2-fg",
  "bg-tone-3-bg text-tone-3-fg",
] as const

export type GiftImageProps = {
  /** `image_url` of the gift. */
  src?: string | null
  /** The gift's title; used as the image's alt text. */
  title: string
  /** Seeds the tile's tone when there is no image (use the gift id). Defaults to the title. */
  id?: string
  /** Shown on the tile instead of the gift icon. */
  emoji?: string | null
  ratio?: keyof typeof RATIOS
  className?: string
}

/** Product image, or a tone tile with an emoji or gift icon. Fills its parent's width. */
export function GiftImage({ src, title, id, emoji, ratio = "4/3", className }: GiftImageProps) {
  const box = cn("relative w-full overflow-hidden", RATIOS[ratio], className)
  if (src) {
    return (
      <div className={cn(box, "bg-muted")}>
        <Image src={src} alt={title} fill sizes="(min-width: 640px) 320px, 100vw" className="object-cover" />
      </div>
    )
  }
  return (
    <div className={cn(box, "flex items-center justify-center select-none", TONES[toneIndex(id ?? title)])} data-slot="gift-tile">
      {emoji ? (
        <span className="text-5xl leading-none" role="img" aria-label={title}>
          {emoji}
        </span>
      ) : (
        <GiftIcon className="size-1/3" strokeWidth={1.5} role="img" aria-label={title} />
      )}
    </div>
  )
}
