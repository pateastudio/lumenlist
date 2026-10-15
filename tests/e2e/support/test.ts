import { test as base, expect, type Page } from "@playwright/test"

// Signed-in pages stream: the server sends the loading skeleton, then the real content in a hidden
// holding element (`<div hidden id="S:…">`) that React moves into place. Until that swap, the same
// field or text can be in the DOM twice (once hidden), and a strict locator refuses to choose. On
// a local build the gap is a few milliseconds; behind CloudFront it was 250ms or more, which
// failed specs on staging (release 1.1). So every full page load waits for the stream to settle.
//
// It also waits for the shell to hydrate. The toaster (and the user menu) are client-only parts
// that React mounts a moment after the rest, about 300ms into the page's life, and sonner's
// container (`<section aria-label="Notifications alt+T">`, in the root layout, so on signed-out
// pages too) is the last of them. A click before that can start a `router.refresh()` that hangs
// and takes the unfinished hydration with it: no toast, a button disabled for good (issue #128).
// No person clicks that early; a spec does, so it waits until the page is really ready.
export async function settled(page: Page): Promise<void> {
  await page
    .waitForFunction(
      () =>
        !document.querySelector('div[hidden][id^="S:"], template[id^="B:"], template[id^="P:"]') &&
        // "Notifications" is sonner's own default label for its container (`containerAriaLabel`),
        // not ours. If a sonner upgrade changes it, or someone passes that prop to <Toaster>, this
        // never matches: the catch below swallows the timeout, every `goto` quietly costs 15s and
        // the #128 flake is back with nothing pointing here. Update the selector with it.
        !!document.querySelector('section[aria-label^="Notifications"]'),
      null,
      { timeout: 15_000 },
    )
    .catch(() => {
      // Navigated away mid-wait, or a page that never settles: let the spec's own assertions decide.
    })
}

// Makes every `page.goto()` on this page wait for the stream to settle and the shell to hydrate.
// The `page` fixture below does it for you; call it yourself on pages you open by hand
// (`await ctx.newPage()`). Only `goto` waits: `page.reload()` and `page.goBack()` do not, and a
// page reached by a click or by `signIn` needs none, because the app only ever navigates on the
// client there and the shell stays mounted.
export function settling(page: Page): Page {
  const goto = page.goto.bind(page)
  page.goto = async (url, options) => {
    const response = await goto(url, options)
    await settled(page)
    return response
  }
  return page
}

export const test = base.extend({
  page: async ({ page }, provide) => {
    await provide(settling(page))
  },
})

export { expect }
