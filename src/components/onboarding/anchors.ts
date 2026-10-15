// Finding the tour's targets on the real screens. Client only: call from effects and handlers.

function isVisible(el: HTMLElement): boolean {
  const box = el.getBoundingClientRect()
  return box.width > 0 && box.height > 0 && getComputedStyle(el).visibility !== "hidden"
}

/** The first match that is really on screen. */
export function firstVisible(selector: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(selector)) if (isVisible(el)) return el
  return null
}

/**
 * The first visible element marked `data-tour="<name>"`. The header tabs and the phone tab bar
 * carry the same names, and only one of them is on screen at a time.
 */
export function findAnchor(name: string): HTMLElement | null {
  return firstVisible(`[data-tour="${name}"]`)
}
