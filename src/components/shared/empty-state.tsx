import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type EmptyStateProps = {
  /** An emoji string or an icon element. */
  icon?: React.ReactNode
  title: React.ReactNode
  text?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export function EmptyState({ icon, title, text, actions, className }: EmptyStateProps) {
  return (
    <Card variant="ink" className={cn("items-center gap-3 px-6 py-10 text-center", className)}>
      {icon ? (
        <div className="flex size-16 items-center justify-center rounded-full bg-hero text-3xl text-foreground [&_svg]:size-8" aria-hidden>
          {icon}
        </div>
      ) : null}
      <h2 className="font-display text-xl font-(weight:--display-weight) text-foreground">{title}</h2>
      {text ? <p className="max-w-sm text-base text-muted-foreground">{text}</p> : null}
      {actions ? <div className="mt-2 flex flex-wrap items-center justify-center gap-3">{actions}</div> : null}
    </Card>
  )
}
