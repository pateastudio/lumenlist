"use client"

import type { RefObject } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { X } from "lucide-react"
import { Sheet, SheetClose } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

/**
 * The First Steps panel: a bottom sheet that stops above the phone tab bar (so the tabs stay
 * usable under it) and a small card at the bottom right on wide screens, with no backdrop there.
 * "trap-focus": a real dialog for the keyboard, while the tab bar still works by touch.
 */
export function StepsSheet({
  open,
  onOpenChange,
  view,
  popupRef,
  returnFocusTo,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  view: string
  popupRef: RefObject<HTMLDivElement | null>
  returnFocusTo: RefObject<HTMLButtonElement | null>
  children: React.ReactNode
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal="trap-focus">
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-x-0 top-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-50 bg-black/10 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs md:hidden" />
        <Dialog.Popup
          ref={popupRef}
          initialFocus={() => popupRef.current?.querySelector<HTMLElement>("[data-autofocus]") ?? true}
          finalFocus={returnFocusTo}
          data-first-steps-panel
          data-view={view}
          className={cn(
            "fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-50 max-h-[calc(100dvh-8.5rem-env(safe-area-inset-bottom))] overflow-y-auto overscroll-contain rounded-t-3xl border-x-(length:--ink-width) border-t-(length:--ink-width) border-border-strong bg-popover p-5 pb-6 text-base text-popover-foreground outline-none",
            "transition duration-200 ease-out data-ending-style:translate-y-10 data-ending-style:opacity-0 data-starting-style:translate-y-10 data-starting-style:opacity-0 motion-reduce:transition-none",
            "md:inset-x-auto md:right-6 md:bottom-6 md:max-h-[calc(100dvh-7rem)] md:w-[26rem] md:rounded-xl md:ink-card md:data-ending-style:translate-y-3 md:data-starting-style:translate-y-3",
          )}
        >
          <SheetClose
            className="absolute top-3 right-3 z-10 grid size-11 place-items-center rounded-full text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring"
            aria-label="Close"
          >
            <X className="size-5" aria-hidden />
          </SheetClose>
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Sheet>
  )
}
