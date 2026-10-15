import { cn } from "@/lib/utils"

export type ClaimChipState = "available" | "mine" | "mine-bought" | "taken" | "taken-bought" | "neutral"

const CHIPS: Record<ClaimChipState, { label: string; className: string }> = {
  available: { label: "Up for grabs", className: "bg-card text-foreground" },
  mine: { label: "You're getting this", className: "bg-secondary text-secondary-foreground" },
  "mine-bought": { label: "You bought this", className: "bg-accent text-accent-foreground" },
  taken: { label: "Someone's on it", className: "bg-muted text-muted-foreground" },
  "taken-bought": { label: "Already bought", className: "bg-muted text-muted-foreground" },
  neutral: { label: "", className: "bg-muted text-muted-foreground" },
}

export type StatusChipProps = {
  state: ClaimChipState
  /** Overrides the default label. Required for `neutral`. */
  label?: React.ReactNode
  className?: string
}

/** Small ink-outlined label. The `data-claim-state` attribute lets tests prove claim UI never reaches a gift's owner. */
export function StatusChip({ state, label, className }: StatusChipProps) {
  const chip = CHIPS[state]
  return (
    <span
      data-claim-state={state}
      className={cn(
        "inline-flex h-7 items-center rounded-chip border-(length:--ink-width) border-border-strong px-3 text-xs font-(weight:--label-weight) whitespace-nowrap",
        chip.className,
        className
      )}
    >
      {label ?? chip.label}
    </span>
  )
}
