/**
 * The themes the picker offers and the one a new visitor gets. Their tokens live in
 * src/app/globals.css. To change the default, set DEFAULT_THEME here and move `:root,` in
 * globals.css (see the comment at the top of the THEMES section).
 */
export const THEME_IDS = ["picnic", "confetti", "patea"] as const

export type ThemeId = (typeof THEME_IDS)[number]

export const DEFAULT_THEME: ThemeId = "picnic"
