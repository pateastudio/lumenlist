import { cn } from "@/lib/utils"

type PageHeaderProps = {
  title: React.ReactNode
  subtitle?: React.ReactNode
  /** Buttons or links. Stack under the title on phones, sit to the right from `sm` up. */
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-3xl leading-tight font-(weight:--display-weight) tracking-(--display-tracking) break-words text-foreground sm:text-4xl">
          {title}
        </h1>
        {subtitle ? <p className="mt-1.5 text-base text-muted-foreground">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3 sm:shrink-0 sm:justify-end">{actions}</div> : null}
    </header>
  )
}
