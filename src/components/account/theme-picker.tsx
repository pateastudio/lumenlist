"use client"

import { useRef, useSyncExternalStore } from "react"
import { Check } from "lucide-react"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DEFAULT_THEME, THEME_IDS, type ThemeId } from "@/lib/themes"
import { cn } from "@/lib/utils"

const BLURBS: Record<ThemeId, { name: string; blurb: string }> = {
  picnic: { name: "Sunday Picnic", blurb: "Ink outlines and sticker shadows" },
  confetti: { name: "Confetti", blurb: "Soft, round and bright" },
  patea: { name: "Patea", blurb: "Cream, plum and a quiet serif" },
}

const THEMES = THEME_IDS.map((id) => ({ id, ...BLURBS[id] }))

// The preview sits inside its own data-theme wrapper, so it shows that theme's tokens
// whatever theme is active. Everything uses tokens, nothing is hard-coded.
function Preview({ id }: { id: ThemeId }) {
  return (
    <span data-theme={id} className="block rounded-xl bg-background p-3 font-sans text-foreground sm:w-64 sm:shrink-0">
      <span className="block rounded-lg bg-hero px-3 py-2 font-display text-lg leading-tight font-(weight:--display-weight-soft)">
        Happy birthday!
      </span>
      <span className="mt-3 flex items-center gap-2">
        <span className="rounded-button border-(length:--ink-width) border-(--button-border) bg-primary px-3 py-1 text-xs font-(weight:--button-weight) text-primary-foreground shadow-button">
          Claim
        </span>
        <span className="rounded-button border-(length:--ink-width) border-(--button-outline-border) bg-card px-3 py-1 text-xs font-(weight:--button-weight) text-card-foreground shadow-button-outline">
          Later
        </span>
        <span className="flex gap-1" aria-hidden="true">
          <span className="size-5 rounded-full bg-tone-0-bg" />
          <span className="size-5 rounded-full bg-tone-1-bg" />
          <span className="size-5 rounded-full bg-tone-2-bg" />
          <span className="size-5 rounded-full bg-tone-3-bg" />
        </span>
      </span>
    </span>
  )
}

const subscribeNever = () => () => {}

export function ThemePicker() {
  const { theme, setTheme } = useTheme()
  // false on the server and during hydration, true afterwards: no mismatch
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false)
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})

  const active: ThemeId = THEME_IDS.find((id) => id === theme) ?? DEFAULT_THEME

  function choose(id: ThemeId) {
    if (id === active) return
    setTheme(id)
    toast.success(`${THEMES.find((t) => t.id === id)?.name} theme on`)
  }

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = THEMES[(index + step + THEMES.length) % THEMES.length]
    choose(next.id)
    refs.current[next.id]?.focus()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Look and feel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {mounted ? (
          <div role="radiogroup" aria-label="Theme" className="grid grid-cols-1 gap-3">
            {THEMES.map((t, i) => {
              const selected = t.id === active
              return (
                <button
                  key={t.id}
                  ref={(el) => {
                    refs.current[t.id] = el
                  }}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => choose(t.id)}
                  onKeyDown={(e) => onKeyDown(e, i)}
                  className={cn(
                    "flex min-h-11 flex-col gap-2 rounded-xl sm:flex-row sm:items-center sm:gap-3 border-2 bg-card p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring",
                    selected ? "border-primary" : "border-border hover:border-muted-foreground"
                  )}
                >
                  <Preview id={t.id} />
                  <span className="flex items-center justify-between gap-2 px-1 pb-1 sm:min-w-0 sm:flex-1 sm:pb-0">
                    <span>
                      <span className="block text-sm font-bold text-foreground">{t.name}</span>
                      <span className="block text-xs text-muted-foreground">{t.blurb}</span>
                    </span>
                    {selected ? <Check className="size-5 shrink-0 text-primary" aria-hidden="true" /> : null}
                  </span>
                </button>
              )
            })}
          </div>
        ) : (
          <div aria-hidden="true" className="grid grid-cols-1 gap-3">
            {THEMES.map((t) => (
              <div key={t.id} className="h-[168px] rounded-xl sm:h-[134px] border-2 border-border bg-muted" />
            ))}
          </div>
        )}
        <p className="text-sm text-muted-foreground">Saved on this device.</p>
      </CardContent>
    </Card>
  )
}
