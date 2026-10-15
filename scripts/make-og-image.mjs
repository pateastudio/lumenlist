// Draws the social card (1200x630): the cover's headline on cream with the gingham hem.
//   node scripts/make-og-image.mjs
// Run by hand when the headline or the Picnic colors change, then commit src/app/opengraph-image.png.
// The colors are Sunday Picnic's, read from src/app/globals.css so they follow the theme. The fonts
// are the ones src/app/layout.tsx loads for Picnic, fetched from Google Fonts while this runs (the
// app itself never calls out: next/font serves its own copies).
import { chromium } from "@playwright/test"
import { readFileSync } from "node:fs"

const css = readFileSync("src/app/globals.css", "utf8")
// Picnic is the default theme: its block opens `:root, [data-theme="picnic"] {` and ends where Confetti's starts.
const start = css.indexOf('[data-theme="picnic"] {')
const end = css.indexOf('[data-theme="confetti"] {')
if (start < 0 || end < start) throw new Error("could not find the Picnic block in globals.css")
const picnic = css.slice(start, end)
const token = (name) => {
  const m = picnic.match(new RegExp(`^\\s*--${name}:\\s*(#[0-9A-Fa-f]{3,8})\\s*;`, "m"))
  if (!m) throw new Error(`no hex --${name} in the Picnic block`)
  return m[1]
}
const [bg, ink, hero, card, primary, onPrimary] = ["background", "foreground", "hero", "card", "primary", "primary-foreground"].map(token)

// Weight only, as next/font loads them: asking for the optical-size axis would draw a narrower cut than the page's.
const fonts = "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@800&family=DM+Sans:wght@500&display=block"

const html = `<!doctype html><html><head>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${fonts}" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0 }
  body { width: 1200px; height: 630px; background: ${bg}; color: ${ink}; font-family: "DM Sans", sans-serif; position: relative; overflow: hidden }
  .wrap { padding: 64px 80px 0 }
  .brand { display: flex; align-items: center; gap: 18px; font: 800 44px "Bricolage Grotesque", sans-serif; letter-spacing: -0.025em }
  .mark { width: 64px; height: 64px; border-radius: 16px; background: ${primary}; border: 4px solid ${ink}; display: grid; place-items: center }
  h1 { font: 800 132px/1 "Bricolage Grotesque", sans-serif; letter-spacing: -0.025em; margin-top: 40px; white-space: nowrap }
  .marker { background: linear-gradient(transparent 56%, ${hero} 56%, ${hero} 92%, transparent 92%); padding-inline: 0.08em; margin-inline: -0.08em }
  p { font-size: 34px; font-weight: 500; margin-top: 30px; opacity: .85 }
  .hem { position: absolute; left: 0; right: 0; bottom: 0; height: 96px; border-top: 4px solid ${ink};
    background-color: ${hero};
    background-image: linear-gradient(90deg, color-mix(in oklab, ${card} 34%, transparent) 50%, transparent 50%), linear-gradient(color-mix(in oklab, ${card} 34%, transparent) 50%, transparent 50%);
    background-size: 64px 64px }
</style></head><body>
<div class="wrap">
  <div class="brand"><span class="mark"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="${onPrimary}" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/></svg></span>Lumen</div>
  <h1>A little list.<br>A big <span class="marker">surprise.</span></h1>
  <p>Gift lists for your family. Surprises stay secret.</p>
</div>
<div class="hem"></div>
</body></html>`

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
await page.setContent(html, { waitUntil: "networkidle" })
await page.evaluate(() => document.fonts.ready)
// A fallback font would still draw a card, a wrong one: refuse to write it.
const loaded = await page.evaluate(() => [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replaceAll('"', "")))
if (!["Bricolage Grotesque", "DM Sans"].every((family) => loaded.includes(family))) {
  await browser.close()
  throw new Error("the fonts did not load (is this machine online?), so no card was written")
}
await page.screenshot({ path: "src/app/opengraph-image.png" })
await browser.close()
console.log("wrote src/app/opengraph-image.png")
