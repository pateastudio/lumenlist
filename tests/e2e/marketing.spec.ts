// The public marketing page (#97): static, no session, the app's real components on made-up data.
import { expect, test } from "./support/test"
import { backend, type TestUser } from "./support/backend"
import { signIn } from "./support/session"

const overflow = (page: import("@playwright/test").Page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)

/**
 * Collects what the page asks for that it should not: any /api/ request, and any request to a host
 * other than the page's own. Both lists stay empty on a page that reads nothing and calls nobody.
 */
function watchRequests(page: import("@playwright/test").Page) {
  const ownHost = new URL(process.env.E2E_BASE_URL ?? "http://localhost:3000").host
  const asked = { api: [] as string[], outside: [] as string[] }
  page.on("request", (r) => {
    const url = new URL(r.url())
    if (url.pathname.startsWith("/api/")) asked.api.push(r.url())
    if (/^https?:$/.test(url.protocol) && url.host !== ownHost) asked.outside.push(r.url())
  })
  return asked
}

test.describe("signed out", () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test("the first screen says what Lumen is and how to start", async ({ page }) => {
    await page.goto("/")
    const h1 = page.getByRole("heading", { level: 1 })
    await expect(h1).toHaveText(/A little list\.\s*A big surprise\./)
    await expect(page.getByText("Lumen helps your family give each other things they'll really love, without spoiling a thing.")).toBeVisible()
    const start = page.getByRole("link", { name: "Start your family's list" }).first()
    await expect(start).toBeInViewport()
    await expect(start).toHaveAttribute("href", "/signup")
    await expect(page.getByRole("link", { name: "I already have an account" }).first()).toHaveAttribute("href", "/login")
    await expect(page.getByText("Got an invite from family?").first()).toBeVisible()
    expect(await overflow(page)).toBe(0)
  })

  test("there is exactly one h1, and the closing repeats the way in", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1)
    await expect(page.getByRole("heading", { name: "One list, all year round." })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Your family's lists are waiting." })).toBeVisible()
    await expect(page.getByText("It takes a minute, and it's free.")).toBeVisible()
    await expect(page.getByRole("link", { name: "Start your family's list" })).toHaveCount(2)
  })

  test("at 320px wide nothing scrolls sideways", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 })
    await page.goto("/")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    expect(await overflow(page)).toBe(0)
  })

  test("it asks the server for nothing but the page", async ({ page }) => {
    const asked = watchRequests(page)
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    expect(asked).toEqual({ api: [], outside: [] })
  })

  test("the blanket: a claim flips the card, shows the toast, lands in the shopping card, and asks the server for nothing", async ({ page }) => {
    const asked = watchRequests(page)
    await page.goto("/")
    const room = page.locator("#blanket")
    await room.scrollIntoViewIfNeeded()
    await expect(room.getByRole("heading", { name: "Go on. Help yourself." })).toBeVisible()

    const shopping = room.locator("[data-demo-shopping]")
    const before = await shopping.getByRole("listitem").count()
    await room.getByRole("button", { name: "I'll get this" }).first().click()
    await expect(page.getByText(/It's yours! Nora won't know/)).toBeVisible()
    // The feeder is Sam's from the start, so look at the card that was tapped.
    await expect(room.locator('[data-piece="tulips"] [data-claim-state="mine"]').first()).toBeVisible()

    // On a phone the shopping card is a card in the deck: bring it forward to read it.
    const tab = room.getByRole("group", { name: "Cards in the pile" }).getByRole("button", { name: /Your shopping/ })
    await tab.click()
    await expect(shopping.getByRole("listitem")).toHaveCount(before + 1)
    await expect(shopping).toContainText("Tulip bulbs")
    expect(asked).toEqual({ api: [], outside: [] })
    expect(await overflow(page)).toBe(0)
  })

  test("a store button on an example card goes nowhere, and no example carries a store's address", async ({ page, context }) => {
    await page.goto("/")
    const room = page.locator("#blanket")
    await room.scrollIntoViewIfNeeded()
    const outside = 'a[href^="http"], a[href^="//"]'
    await expect(room.locator(outside)).toHaveCount(0)
    await expect(page.locator("main").locator(outside)).toHaveCount(0)

    const pages = context.pages().length
    await room.getByRole("button", { name: /homedepot\.com|brooklinen\.com|amazon\.com/ }).first().click()
    await expect(page.getByText("Just an example. In Lumen, this opens the store.")).toBeVisible()
    await expect(page).toHaveURL(/\/$/)
    expect(context.pages().length).toBe(pages)

    // The details sheet is drawn outside the room (a portal): its store button is an example too.
    await room.getByRole("button", { name: /, details$/ }).first().click()
    const sheet = page.getByRole("dialog")
    await expect(sheet.getByRole("button", { name: /homedepot\.com|brooklinen\.com|amazon\.com/ })).toBeVisible()
    await expect(sheet.locator(outside)).toHaveCount(0)
  })
  test("the legal pages are published: the footer links to both, each shows its date, and sign-up names them", async ({ page }) => {
    await page.goto("/")
    const footer = page.getByRole("contentinfo")
    await expect(footer.getByText("© 2026 Patea LLC")).toBeVisible()
    await expect(footer.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/terms")
    await footer.getByRole("link", { name: "Privacy" }).click()
    await expect(page).toHaveURL(/\/privacy$/)
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Lumen Privacy Policy")
    await expect(page.getByText("Effective October 13, 2026")).toBeVisible()
    await expect(page.getByText("Not published yet")).toHaveCount(0)

    const terms = await page.request.get("/terms")
    expect(terms.status()).toBe(200)
    await page.goto("/terms")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(page.getByText("Effective October 13, 2026")).toBeVisible()

    await page.goto("/signup")
    const line = page.getByText("By creating an account you agree")
    await expect(line).toBeVisible()
    await expect(line.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/terms")
    await expect(line.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy")
  })
})

test.describe("signed out, wide", () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  test("the blanket at 1280px: claiming the tulips lands a row in the shopping card, asks the server for nothing, and nothing scrolls sideways", async ({
    page,
  }) => {
    const asked = watchRequests(page)
    await page.goto("/")
    const room = page.locator("#blanket")
    await room.scrollIntoViewIfNeeded()
    const tulips = room.locator('[data-piece="tulips"]')
    await tulips.getByRole("button", { name: "I'll get this" }).click()
    await expect(tulips.locator('[data-claim-state="mine"]').first()).toBeVisible()
    await expect(room.locator("[data-demo-shopping]")).toContainText("Tulip bulbs")
    expect(asked).toEqual({ api: [], outside: [] })
    expect(await overflow(page)).toBe(0)
  })
})

test.describe("signed out, a small laptop", () => {
  test.use({ viewport: { width: 1024, height: 768 } })

  test("at 1024px the headline keeps to its own column, clear of the card beside it", async ({ page }) => {
    await page.goto("/")
    const h1 = page.getByRole("heading", { level: 1 })
    const line = await h1.locator("span.whitespace-nowrap").boundingBox()
    const column = await h1.locator("xpath=..").boundingBox()
    expect(line!.x + line!.width).toBeLessThanOrEqual(column!.x + column!.width)
    expect(await overflow(page)).toBe(0)
  })
})

test.describe("the steps on the phone", () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test("step 3's button really works, and Nora's side never shows a claim", async ({ page }) => {
    const asked = watchRequests(page)
    await page.goto("/")
    const steps = page.locator("#steps")
    await steps.getByRole("heading", { name: "Make your list." }).scrollIntoViewIfNeeded()
    await expect(steps.getByRole("group", { name: "Example: Nora's list, on a phone" })).toBeVisible()
    for (const title of ["Make your list.", "Peek at everyone else's.", "Call dibs.", "It stays a surprise."]) {
      await expect(steps.getByRole("heading", { name: title })).toBeAttached()
    }
    await expect(steps.locator("ol > li")).toHaveCount(4)
    await expect(steps.locator('a[href^="http"], a[href^="//"]')).toHaveCount(0)

    // Nora's side: no claim on it, and (below) not one character of it changes when a gift is claimed.
    // Both captures are taken while her side is the one showing (step 1 here, step 4 below), so the
    // face's own attributes are compared too.
    const noraSide = steps.locator('[data-face="nora"]')
    await expect(noraSide).toHaveAttribute("data-hidden", "false")
    await expect(noraSide.locator("[data-claim-state]")).toHaveCount(0)
    await expect(noraSide).toContainText("Waffle-knit robe")
    await expect(noraSide).toContainText("6 gifts on her list. No names, no claims, nothing about who is getting what.")
    const before = await noraSide.evaluate((el) => el.outerHTML)

    // The caption is one live region that stays in the page, so a flip is read out.
    const caption = steps.locator("[aria-live]").filter({ hasText: /(Nora's|Your) phone$/ })
    await expect(caption).toContainText("Nora's phone")
    await caption.evaluate((el) => el.setAttribute("data-kept", "yes"))

    await steps.getByRole("heading", { name: "Call dibs." }).scrollIntoViewIfNeeded()
    const mine = steps.locator('[data-face="you"]')
    await expect(mine).toHaveAttribute("data-hidden", "false")
    await expect(caption).toContainText("Your phone")
    await expect(caption).toHaveAttribute("data-kept", "yes")
    // The control for the comparison of Nora's side below: the same measure, taken on your side, does see the claim.
    const mineBefore = await mine.evaluate((el) => el.outerHTML)
    await mine.getByRole("button", { name: "I'll get this" }).first().click()
    await expect(page.getByText(/It's yours! Nora won't know/)).toBeVisible()
    await expect(steps.getByText("That's all there is to it.")).toBeVisible()
    await expect(mine.locator('[data-claim-state="mine"]').first()).toBeVisible()
    expect(await mine.evaluate((el) => el.outerHTML)).not.toBe(mineBefore)

    await steps.getByRole("heading", { name: "It stays a surprise." }).scrollIntoViewIfNeeded()
    await expect(steps.getByText("Same list as step 1.")).toBeVisible()
    await expect(noraSide).toHaveAttribute("data-hidden", "false")
    await expect(noraSide.locator("[data-claim-state]")).toHaveCount(0)
    await expect(noraSide).toContainText("Waffle-knit robe")
    expect(await noraSide.evaluate((el) => el.outerHTML)).toBe(before)
    expect(asked).toEqual({ api: [], outside: [] })
    expect(await overflow(page)).toBe(0)
  })

  test("the switch flips the phone by hand", async ({ page }) => {
    await page.goto("/")
    const steps = page.locator("#steps")
    await steps.getByRole("heading", { name: "It stays a surprise." }).scrollIntoViewIfNeeded()
    const group = steps.getByRole("group", { name: "Whose phone are you looking at?" })
    const you = group.getByRole("button", { name: "You see" })
    const nora = group.getByRole("button", { name: "Nora sees" })
    await expect(nora).toHaveAttribute("aria-pressed", "true")
    await you.click()
    await expect(steps.locator('[data-face="you"]')).toHaveAttribute("data-hidden", "false")
    await expect(steps.locator('[data-face="nora"]')).toHaveAttribute("data-hidden", "true")
    await expect(you).toHaveAttribute("aria-pressed", "true")
    await expect(you).toBeFocused()
    await nora.click()
    await expect(steps.locator('[data-face="nora"]')).toHaveAttribute("data-hidden", "false")
    await expect(nora).toHaveAttribute("aria-pressed", "true")
  })

  test("a claim on the blanket shows on the phone, and still not on Nora's side", async ({ page }) => {
    await page.goto("/")
    const steps = page.locator("#steps")
    const noraSide = steps.locator('[data-face="nora"]')
    await expect(noraSide).toHaveAttribute("data-hidden", "false")
    const before = await noraSide.evaluate((el) => el.outerHTML)
    const mine = steps.locator('[data-face="you"]')
    const mineBefore = await mine.evaluate((el) => el.outerHTML)
    const room = page.locator("#blanket")
    await room.scrollIntoViewIfNeeded()
    await room.getByRole("button", { name: "I'll get this" }).first().click()
    await expect(room.locator('[data-piece="tulips"] [data-claim-state="mine"]').first()).toBeVisible()
    // The phone is on Nora's side up here, so your side is there but not shown.
    await expect(mine.locator("li").filter({ hasText: "Tulip bulbs" }).locator('[data-claim-state="mine"]').first()).toBeAttached()
    // Your side changed, so the measure sees a claim; Nora's did not change by one character.
    expect(await mine.evaluate((el) => el.outerHTML)).not.toBe(mineBefore)
    expect(await noraSide.evaluate((el) => el.outerHTML)).toBe(before)
  })

  test("every link in the page's body is a public one", async ({ page }) => {
    await page.goto("/")
    const hrefs = await page.locator("main a[href]").evaluateAll((links) => links.map((a) => a.getAttribute("href") ?? ""))
    expect(hrefs.length).toBeGreaterThan(4)
    for (const href of hrefs) {
      expect(href, href).toMatch(/^(\/signup|\/login|#|\/$)/)
      expect(href, href).not.toMatch(/^\/(gifts|dashboard|families|members|account)/)
    }
  })
})

// A phone with the browser's bars showing: the phone's window is at its shortest (300px).
for (const size of [
  { width: 390, height: 664 },
  { width: 320, height: 568 },
]) {
  test.describe(`step 3 on a short screen, ${size.width} by ${size.height}`, () => {
    test.use({ viewport: size })

    test("the button is whole, clear of the fade and big enough to tap", async ({ page }) => {
      await page.goto("/")
      const steps = page.locator("#steps")
      await steps.getByRole("heading", { name: "Call dibs." }).scrollIntoViewIfNeeded()
      const view = steps.locator("[data-zoom]")
      await expect(view).toHaveAttribute("data-zoom", "near")
      const button = steps.locator('[data-face="you"]').getByRole("button", { name: "I'll get this" }).first()

      const measure = async () => {
        const b = (await button.boundingBox())!
        const v = (await view.boundingBox())!
        const fade = await view.evaluate((el) => parseFloat(getComputedStyle(el, "::after").height))
        return { height: b.height, above: b.y - v.y, left: b.x - v.x, right: v.x + v.width - (b.x + b.width), below: v.y + v.height - (b.y + b.height), fade }
      }
      // The view moves in and the screen scrolls; wait for both to finish, then look once.
      await expect.poll(async () => (await measure()).height).toBeGreaterThanOrEqual(44)
      await expect
        .poll(async () => {
          const m = await measure()
          return m.below - m.fade
        })
        .toBeGreaterThanOrEqual(0)
      const m = await measure()
      expect(m.fade).toBeGreaterThan(0)
      expect(m.height).toBeGreaterThanOrEqual(44)
      expect(m.above).toBeGreaterThanOrEqual(0)
      expect(m.left).toBeGreaterThanOrEqual(0)
      expect(m.right).toBeGreaterThanOrEqual(0)
      expect(m.below).toBeGreaterThanOrEqual(m.fade)

      await button.click()
      await expect(page.getByText(/It's yours! Nora won't know/)).toBeVisible()
      expect(await overflow(page)).toBe(0)
    })
  })
}

test.describe("with JavaScript off", () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } })

  // Its own page, not the `page` fixture: that one waits for the shell to hydrate, which never happens here.
  test("the message is all there and the links work", async ({ context }) => {
    const page = await context.newPage()
    await page.goto("/")
    await expect(page.getByRole("heading", { level: 1 })).toContainText("A big surprise.")
    for (const title of [
      "Go on. Help yourself.",
      "How it works, in four steps.",
      "Make your list.",
      "Peek at everyone else's.",
      "Call dibs.",
      "It stays a surprise.",
      "One list, all year round.",
      "Your family's lists are waiting.",
    ]) {
      await expect(page.getByRole("heading", { name: title })).toBeVisible()
    }
    await expect(page.getByText("Now look at Nora's phone again.")).toBeVisible()
    // The two lines that point at working buttons are not shown where nothing works.
    await expect(page.getByText("The button on the phone really works.")).toBeHidden()
    await expect(page.getByText("Flip the phone with the")).toBeHidden()
    // The phone shows step 1: Nora's own list.
    await expect(page.locator('#steps [data-face="nora"]')).toContainText("Waffle-knit robe")
    await expect(page.locator('#steps [data-face="nora"]')).toBeVisible()
    await page.getByRole("link", { name: "Start your family's list" }).first().click()
    await expect(page).toHaveURL(/\/signup/)
  })
})

test.describe("small and themed", () => {
  test("a 320px phone: no sideways scroll, the headline and the button on the first screen", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 320, height: 568 } })
    const page = await ctx.newPage()
    await page.goto("/")
    await expect(page.getByRole("heading", { level: 1 })).toBeInViewport()
    await expect(page.getByRole("link", { name: "Start your family's list" }).first()).toBeVisible()
    for (const id of ["#blanket", "#steps"]) {
      await page.locator(id).scrollIntoViewIfNeeded()
      expect(await overflow(page)).toBe(0)
    }
    await ctx.close()
  })

  test("a visitor with another theme saved still gets a readable page", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
    await ctx.addInitScript(() => window.localStorage.setItem("lumen-theme", "confetti"))
    const page = await ctx.newPage()
    const errors: string[] = []
    page.on("pageerror", (e) => errors.push(String(e)))
    await page.goto("/")
    await expect(page.locator("html")).toHaveAttribute("data-theme", "confetti")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    expect(await overflow(page)).toBe(0)
    expect(errors).toEqual([])
    await ctx.close()
  })

  test("reduced motion: everything is there and nothing errors", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" })
    const page = await ctx.newPage()
    const errors: string[] = []
    page.on("pageerror", (e) => errors.push(String(e)))
    await page.goto("/")
    await page.locator("#blanket").scrollIntoViewIfNeeded()
    await expect(page.locator("#blanket").getByRole("button", { name: "I'll get this" }).first()).toBeVisible()
    await page.locator("#steps").scrollIntoViewIfNeeded()
    await expect(page.locator("#steps").getByRole("heading", { name: "It stays a surprise." })).toBeAttached()
    expect(errors).toEqual([])
    await ctx.close()
  })
})

test.describe("around the page", () => {
  test("the sign-in page's logo leads back to the front page", async ({ page }) => {
    await page.goto("/login")
    await page.getByRole("link", { name: "Lumen", exact: true }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole("heading", { level: 1 })).toContainText("A big surprise.")
  })

  test("robots: this is not production, so nothing is to be indexed", async ({ request }) => {
    const res = await request.get("/robots.txt")
    expect(res.ok()).toBe(true)
    expect(res.headers()["content-type"]).toContain("text/plain")
    expect(await res.text()).toMatch(/Disallow: \/\s*$/m)
  })

  test("the head carries the social card and a canonical address", async ({ page }) => {
    await page.goto("/")
    const head = (property: string) => page.locator(`head meta[property="${property}"]`)
    await expect(head("og:title")).toHaveAttribute("content", "Lumen: gift lists for your family")
    await expect(head("og:image")).toHaveAttribute("content", /^https?:\/\/[^/]+\/opengraph-image\.png/)
    await expect(head("og:image:alt")).toHaveAttribute("content", "Lumen. A little list. A big surprise. Gift lists for your family.")
    await expect(page.locator('head meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image")
    await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute("href", /^https?:\/\/[^/]+\/?$/)
    // Asked of this server by path: the address in the tag is the deployed one.
    const card = new URL((await head("og:image").getAttribute("content"))!)
    const image = await page.request.get(card.pathname + card.search)
    expect(image.ok()).toBe(true)
    expect(image.headers()["content-type"]).toBe("image/png")
  })
})

test.describe("signed in", () => {
  let user: TestUser
  test.beforeAll(async () => {
    user = await backend.createUser("mk-member")
  })
  test.afterAll(async () => {
    await backend.deleteUser(user)
  })

  test("/ goes straight to Home", async ({ page }) => {
    await signIn(page, user)
    await page.goto("/")
    await expect(page).toHaveURL(/\/dashboard$/)
  })
})
