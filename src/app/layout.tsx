import type { Metadata, Viewport } from "next"
import { Bricolage_Grotesque, DM_Sans, Fredoka, Geist_Mono, Instrument_Sans, Newsreader, Nunito } from "next/font/google"
import { ThemeProvider } from "next-themes"
import { SITE_DESCRIPTION } from "@/components/marketing/copy"
import { ToasterClient } from "@/components/ui/toaster-client"
import { DEFAULT_THEME, THEME_IDS } from "@/lib/themes"
import "./globals.css"

// Variable fonts, exposed as --font-bricolage / --font-dm-sans. globals.css maps them
// to the theme tokens --font-display / --font-sans, so a theme can swap fonts.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
})

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
})

// Confetti's fonts are opt-in: preload: false keeps them out of the <head> preload links, and
// the browser only fetches a font file once a rendered element uses it, so Picnic users never
// download them.
const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  display: "swap",
  preload: false,
})

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  display: "swap",
  preload: false,
})

// Patea's fonts are opt-in too (preload: false). Newsreader's optical-size axis (opsz) is included, so
// the browser picks the right cut for each size; weights stay on the variable range (the theme uses 500).
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
  preload: false,
})

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  display: "swap",
  preload: false,
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  // Makes the social card's and the canonical addresses absolute. NEXT_PUBLIC_ values are fixed at
  // build time, and each environment builds its own bundle with its own address (scripts/deploy.sh).
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: { default: "Lumen", template: "%s · Lumen" },
  description: SITE_DESCRIPTION,
}

// viewport-fit=cover lets the bottom tab bar pad for the iPhone home indicator (env(safe-area-inset-bottom)).
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" }

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${dmSans.variable} ${bricolage.variable} ${fredoka.variable} ${nunito.variable} ${newsreader.variable} ${instrumentSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="data-theme"
          themes={[...THEME_IDS]}
          defaultTheme={DEFAULT_THEME}
          enableSystem={false}
          storageKey="lumen-theme"
        >
          {children}
          <ToasterClient />
        </ThemeProvider>
      </body>
    </html>
  )
}
