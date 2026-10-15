// The first-run tour (#98): the walk, then First Steps, remembered per person in the database.
import type { Page } from "@playwright/test"
import { expect, settling, test } from "./support/test"
import { backend, type TestUser } from "./support/backend"
import { signIn } from "./support/session"

test.describe.configure({ mode: "serial" })
test.use({ viewport: { width: 390, height: 844 } })

let host: TestUser
let guest: TestUser
let hasty: TestUser
let loner: TestUser
let shy: TestUser
let kettleId: string
const stamp = Date.now().toString(36)
// Long names must wrap, not push the page sideways: exactly the form's 100 characters, ending in
// one word with no space or hyphen to break on.
const familyHead = `E2E ${stamp} The Extraordinarily Long-Named Family Of `
const longFamily = familyHead + "Supercalifragilisticexpialidocious".repeat(3).slice(0, 100 - familyHead.length)

const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
const pill = (page: Page) => page.locator("[data-first-steps-launcher]")
const welcomeCard = (page: Page) => page.locator('[data-walk="welcome"]')
/** Resolves when the server has recorded this tour event, so the next browser is sure to read it. */
const recorded = (page: Page, event: string) =>
  page.waitForResponse((r) => r.url().endsWith("/api/onboarding") && r.request().postDataJSON()?.event === event && r.ok())

type Seen = { __welcomeSeen: boolean }
/** From now on, on this document, notes whether the welcome is ever drawn, even for one frame. */
const watchForWelcome = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as Seen
    w.__welcomeSeen = document.querySelector('[data-walk="welcome"]') !== null
    const sel = '[data-walk="welcome"]'
    // Every node ever added is looked at, so a welcome put up and taken down again between two
    // looks at the page is still caught.
    new MutationObserver((records) => {
      if (document.querySelector(sel)) w.__welcomeSeen = true
      for (const r of records) {
        if (r.target instanceof Element && r.target.matches(sel)) w.__welcomeSeen = true
        for (const node of r.addedNodes) if (node instanceof Element && (node.matches(sel) || node.querySelector(sel))) w.__welcomeSeen = true
      }
    }).observe(document.documentElement, { childList: true, subtree: true, attributes: true })
  })
const welcomeSeen = (page: Page) => page.evaluate(() => (window as unknown as Seen).__welcomeSeen)

/** How far the walk's cut-out is from the first visible `data-tour` anchor of that name, in pixels. */
const ringOffset = (page: Page, anchor: string) =>
  page.evaluate((name) => {
    const ring = document.querySelector('[data-walk="ring"]')?.getBoundingClientRect()
    const target = [...document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)].map((el) => el.getBoundingClientRect()).find((b) => b.width > 0 && b.height > 0)
    if (!ring || !target) return 9999
    const centre = (b: DOMRect) => [b.left + b.width / 2, b.top + b.height / 2]
    const [rx, ry] = centre(ring)
    const [tx, ty] = centre(target)
    // Same middle, and the same size but for the cut-out's padding and border.
    return Math.max(Math.abs(rx - tx), Math.abs(ry - ty), Math.abs(ring.width - target.width) - 20, Math.abs(ring.height - target.height) - 20)
  }, anchor)

test.beforeAll(async ({ browser }) => {
  host = await backend.createUser("ob-host")
  guest = await backend.createUser("ob-guest", { tour: "fresh" })
  hasty = await backend.createUser("ob-hasty", { tour: "fresh" })
  loner = await backend.createUser("ob-loner", { tour: "fresh" })
  shy = await backend.createUser("ob-shy", { tour: "fresh" })
  expect(longFamily).toHaveLength(100)
  expect(longFamily.split(/[\s-]/).pop()!.length).toBeGreaterThanOrEqual(30)

  const ctx = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] })
  const page = settling(await ctx.newPage())
  await signIn(page, host)
  await page.goto("/families/new")
  await page.getByLabel("Family name").fill(longFamily)
  await page.getByRole("button", { name: "Create family" }).click()
  await expect(page).toHaveURL(/\/families\/[0-9a-f-]{36}$/)
  await page.getByRole("button", { name: "Invite someone" }).click()
  await page.getByRole("button", { name: /copy invite link/i }).click()
  await expect(page.getByText("Link copied!")).toBeVisible()
  const joinPath = new URL(await page.evaluate(() => navigator.clipboard.readText())).pathname
  for (const title of [`E2E Kettle ${stamp}`, `E2E Socks ${stamp}`]) {
    const made = await page.request.post("/api/gifts", { data: { title } })
    expect(made.ok()).toBe(true)
    if (title.includes("Kettle")) kettleId = (await made.json()).gift.id
  }
  await ctx.close()

  // The guests join through the API, so the first signed-in page they SEE is in the tests below.
  for (const who of [guest, hasty]) {
    const c = await browser.newContext()
    const p = settling(await c.newPage())
    await signIn(p, who)
    expect((await p.request.post(`/api${joinPath}`)).ok()).toBe(true)
    await c.close()
  }
})

test.afterAll(async () => {
  for (const u of [guest, hasty, loner, shy, host]) if (u) await backend.deleteUser(u)
})

test("an established person is not offered the tour", async ({ page }) => {
  await signIn(page, host)
  await page.goto("/dashboard")
  await expect(page.getByText("Welcome back")).toBeVisible()
  await expect(welcomeCard(page)).toHaveCount(0)
  await expect(pill(page)).toHaveCount(0)
})

test("invited: the welcome, four stops, the hand-off, and a checklist the walk did not tick", async ({ page }) => {
  await signIn(page, guest)
  await page.goto("/dashboard")
  const welcome = welcomeCard(page)
  await expect(welcome).toContainText("Welcome to Lumen")
  await expect(welcome).toContainText(`You're in ${longFamily}`)
  expect(await overflow(page)).toBe(0)
  await expect(pill(page)).toHaveCount(0)

  await page.getByRole("button", { name: "Show me around" }).click()
  for (const [n, title, next] of [
    [1, "Your list lives here", "Next"],
    [2, "Adding a gift is quick", "Next"],
    [3, "Pick something for", "Next"],
    [4, "can't see any of this", "Got it"],
  ] as const) {
    const card = page.getByRole("dialog").filter({ hasText: `Step ${n} of 4` })
    await expect(card).toContainText(title)
    await expect(pill(page)).toHaveCount(0)
    expect(await overflow(page)).toBe(0)
    // From here on the welcome must never be drawn again, not even for a frame.
    if (n === 4) await watchForWelcome(page)
    await card.getByRole("button", { name: next, exact: true }).click()
  }
  await expect(page).toHaveURL(new RegExp(`/members/${host.id}`))

  const handoff = page.locator('[data-walk-step="handoff"]')
  await expect(handoff).toContainText("Now, your first steps")
  await expect(pill(page)).toBeVisible()
  expect(await overflow(page)).toBe(0)
  const walkEnded = recorded(page, "walk_completed")
  await handoff.getByRole("button", { name: "Show my first steps" }).click()

  const sheet = page.locator("[data-first-steps-panel]")
  await expect(sheet).toContainText("0 of 4 done")
  for (const row of ["Add something you'd love", "Peek at", "Call dibs on a gift", "See how surprises stay secret"]) {
    await expect(sheet).toContainText(row)
  }
  await expect(sheet.locator("[data-task]")).toHaveCount(4)
  expect(await overflow(page)).toBe(0)
  await walkEnded
  // The walk has gone and the welcome never flashed up on the way out.
  await expect(page.locator("[data-walk]")).toHaveCount(0)
  expect(await welcomeSeen(page)).toBe(false)
  // Still nothing ticked, now that the server has caught up: standing on this list is not a peek.
  await expect(sheet).toContainText("0 of 4 done")
})

test("the walk does not come back, and opening a list yourself is a peek", async ({ page }) => {
  await signIn(page, guest)
  // Before they open any list: the walk ticked nothing, in the database either.
  await page.goto("/dashboard")
  await expect(pill(page)).toContainText("0 of 4")
  await expect(welcomeCard(page)).toHaveCount(0)
  await page.goto(`/members/${host.id}`)
  await expect(welcomeCard(page)).toHaveCount(0)
  // The sheet above said 0 of 4 while they stood on this very list: being left there by the walk
  // did not count. This is a new browser and their own visit, so now it does.
  await expect(pill(page)).toContainText("1 of 4")
})

test("doing a step ticks it", async ({ page }) => {
  await signIn(page, guest)
  await page.goto("/gifts/new")
  const hint = page.locator('[data-tour-hint="add"]')
  await expect(hint).toBeVisible()
  expect(await overflow(page)).toBe(0)
  await hint.getByRole("button", { name: "Got it" }).click()
  await expect(hint).toHaveCount(0)
  await page.getByLabel("What is it?").fill(`E2E Mine ${stamp}`)
  await page.getByRole("button", { name: "Add to my list" }).click()
  await expect(page).toHaveURL(/\/gifts$/)
  await expect(pill(page)).toContainText("2 of 4")
})

test("hiding the steps is remembered in the database, not the browser", async ({ page, browser }) => {
  await signIn(page, guest)
  await page.goto("/dashboard")
  await pill(page).click()
  const hidden = recorded(page, "steps_hidden")
  await page.getByRole("button", { name: "Hide these steps" }).click()
  await expect(pill(page)).toHaveCount(0)
  await hidden

  const other = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const p = settling(await other.newPage())
  await signIn(p, guest)
  await p.goto("/dashboard")
  await expect(p.getByText("Welcome back")).toBeVisible()
  await expect(pill(p)).toHaveCount(0)
  await expect(welcomeCard(p)).toHaveCount(0)
  await other.close()
})

test("replay from Account runs the walk again and brings the steps back", async ({ page }) => {
  await signIn(page, guest)
  await page.goto("/account")
  // Hidden in the test above: nothing of the tour is left until they ask for it here.
  await expect(pill(page)).toHaveCount(0)
  expect(await overflow(page)).toBe(0)
  const again = page.getByRole("button", { name: "Show me around again" })

  // A restart that doesn't reach the server says so and changes nothing.
  await page.route("**/api/onboarding", (route) => route.abort(), { times: 1 })
  await again.click()
  await expect(page.getByText("Couldn't start the tour. Try again.")).toBeVisible()
  await expect(again).toBeEnabled()
  await expect(page).toHaveURL(/\/account$/)
  await expect(page.locator("[data-walk]")).toHaveCount(0)
  await expect(pill(page)).toHaveCount(0)

  await watchForWelcome(page)
  await again.click()
  await expect(page).toHaveURL(/\/dashboard$/)
  const first = page.getByRole("dialog").filter({ hasText: "Step 1 of 4" })
  await expect(first).toContainText("Welcome back to the tour")
  // Straight to stop one: someone who asked for the tour is not asked whether they want it,
  // and the question never flashes up on the way.
  await expect(welcomeCard(page)).toHaveCount(0)
  expect(await welcomeSeen(page)).toBe(false)
  const skipped = recorded(page, "walk_skipped")
  await page.keyboard.press("Escape")
  await expect(first).toHaveCount(0)
  // Skipping the walk leaves the steps, and a replay undoes nothing they did: the gift they added
  // and the list they opened are both still ticked.
  await expect(pill(page)).toContainText("2 of 4")
  // The card that held the keyboard has gone: focus is on the pill, not lost to the page.
  await expect(pill(page)).toBeFocused()
  await skipped
  // One trip from Account to Home, so one Back returns there, and the walk stays skipped.
  await page.goBack()
  await expect(page).toHaveURL(/\/account$/)
  await expect(page.locator("[data-walk]")).toHaveCount(0)
  await expect(pill(page)).toContainText("2 of 4")
  await expect(page.getByRole("button", { name: "Show me around again" })).toBeEnabled()
})

test("replay with every step done ends on You know everything, and the tour is over", async ({ page }) => {
  await signIn(page, guest)
  // The two steps still to do: call dibs (through the API) and open the explainer.
  expect((await page.request.post(`/api/gifts/${kettleId}/claim`, { data: {} })).ok()).toBe(true)
  await page.goto("/dashboard")
  await expect(pill(page)).toContainText("3 of 4")
  await pill(page).click()
  const seen = recorded(page, "secret_seen")
  await page.locator('[data-first-steps-panel] [data-task="secret"]').click()
  await seen

  await page.goto("/account")
  await page.getByRole("button", { name: "Show me around again" }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  for (const [n, title, next] of [
    [1, "Your list lives here", "Next"],
    [2, "Adding a gift is quick", "Next"],
    [3, "Pick something for", "Next"],
    [4, "can't see any of this", "Got it"],
  ] as const) {
    const card = page.getByRole("dialog").filter({ hasText: `Step ${n} of 4` })
    await expect(card).toContainText(title)
    await expect(pill(page)).toHaveCount(0)
    await card.getByRole("button", { name: next, exact: true }).click()
  }

  // Nothing is left to hand over to: no hand-off card, no pill, just the ending.
  const ending = page.locator('[data-walk="finish"]')
  await expect(ending).toContainText("That's it. You know everything.")
  await expect(page.locator('[data-walk-step="handoff"]')).toHaveCount(0)
  await expect(pill(page)).toHaveCount(0)
  expect(await overflow(page)).toBe(0)
  const over = recorded(page, "steps_completed")
  await ending.getByRole("button", { name: "Done", exact: true }).click()
  await expect(page.locator("[data-walk]")).toHaveCount(0)
  await expect(pill(page)).toHaveCount(0)
  await over
  const row = await backend.tourRow(guest)
  expect(row).toMatchObject({ walk_outcome: "completed", steps_outcome: "completed" })
  expect(row?.walk_ended_at).not.toBeNull()
  expect(row?.steps_ended_at).not.toBeNull()

  await page.goto("/dashboard")
  await expect(page.getByText("Welcome back")).toBeVisible()
  await expect(page.locator("[data-walk]")).toHaveCount(0)
  await expect(pill(page)).toHaveCount(0)
})

test("Escape on the way to someone's list is not a peek", async ({ page }) => {
  await signIn(page, hasty)
  await page.goto("/dashboard")
  await page.getByRole("button", { name: "Show me around" }).click()
  await page.getByRole("dialog").filter({ hasText: "Step 1 of 4" }).getByRole("button", { name: "Next", exact: true }).click()
  const second = page.getByRole("dialog").filter({ hasText: "Step 2 of 4" })
  await expect(second).toContainText("Adding a gift is quick")

  // The moment between two pages is under a second on a good day. Hold the list's page back at
  // the network (the app's own timing is untouched), so the walk is surely still on its way there.
  let letThrough = () => {}
  const held = new Promise<void>((resolve) => (letThrough = resolve))
  const theirList = (url: URL) => url.pathname === `/members/${host.id}`
  await page.route(theirList, async (route) => {
    await held
    await route.continue()
  })
  const asked = page.waitForRequest((r) => theirList(new URL(r.url())))
  await second.getByRole("button", { name: "Next", exact: true }).click()
  await asked
  await expect(page.locator('[data-walk="moving"]')).toContainText("One sec")
  await expect(page.locator('[data-walk="card"]')).toHaveCount(0)
  await expect(page).toHaveURL(/\/gifts$/)

  const skipped = recorded(page, "walk_skipped")
  await page.keyboard.press("Escape")
  await expect(page.locator("[data-walk]")).toHaveCount(0)
  await skipped
  // The walk is over, and the page it had already asked for still arrives.
  letThrough()
  await expect(page).toHaveURL(new RegExp(`/members/${host.id}`))
  await expect(page.locator('[data-tour="their-surprise-note"]')).toBeVisible()
  await page.unroute(theirList)

  // The walk brought them here, not their own tap: nothing is ticked.
  await pill(page).click()
  const sheet = page.locator("[data-first-steps-panel]")
  await expect(sheet).toContainText("0 of 4 done")
  await expect(sheet.locator('[data-task="peek"]')).not.toContainText("(done)")
  // Events go to the server in order, so once this later one is in, a peek would be in too.
  const seen = recorded(page, "secret_seen")
  await sheet.locator('[data-task="secret"]').click()
  await seen
  expect(await backend.tourRow(hasty)).toMatchObject({ walk_outcome: "skipped", peeked_at: null })
  expect((await backend.tourRow(hasty))?.secret_seen_at).not.toBeNull()
})

test("on their own: the other stops and the other steps", async ({ page }) => {
  await signIn(page, loner)
  await page.goto("/dashboard")
  await expect(page.getByText("Welcome", { exact: true })).toBeVisible()
  const welcome = welcomeCard(page)
  await expect(welcome).toContainText("Welcome to Lumen")
  await expect(welcome).not.toContainText("You're in")
  await page.getByRole("button", { name: "Show me around" }).click()
  for (const [n, title, anchor, path, next] of [
    [1, "Your list lives here", "tab-mine", "/dashboard", "Next"],
    [2, "Adding a gift is quick", "list-add-gift", "/gifts", "Next"],
    [3, "Bring your people", "tab-family", "/gifts", "Next"],
    [4, "Surprises stay secret", "home-surprise", "/dashboard", "Got it"],
  ] as const) {
    const card = page.getByRole("dialog").filter({ hasText: `Step ${n} of 4` })
    await expect(card).toContainText(title)
    await expect(page).toHaveURL(new RegExp(`${path}$`))
    // The cut-out sits on this stop's own target: the Family tab for three, Home's surprise note for four.
    await expect.poll(() => ringOffset(page, anchor)).toBeLessThanOrEqual(4)
    await expect(pill(page)).toHaveCount(0)
    expect(await overflow(page)).toBe(0)
    await card.getByRole("button", { name: next, exact: true }).click()
  }

  const handoff = page.locator('[data-walk-step="handoff"]')
  await expect(handoff).toContainText("Now, your first steps")
  const walkEnded = recorded(page, "walk_completed")
  await handoff.getByRole("button", { name: "Show my first steps" }).click()
  const sheet = page.locator("[data-first-steps-panel]")
  await expect(sheet).toContainText("0 of 4 done")
  for (const row of ["Add something you'd love", "Start your family", "Invite someone", "See how surprises stay secret"]) {
    await expect(sheet).toContainText(row)
  }
  await expect(sheet).not.toContainText("Call dibs on a gift")
  await expect(sheet).toContainText("Calling dibs on gifts comes next, once your family joins.")
  expect(await overflow(page)).toBe(0)
  await walkEnded
  await expect(sheet).toContainText("0 of 4 done")
})

test("on their own: the invite hint on their new family's page goes for good with Got it", async ({ page }) => {
  await signIn(page, loner)
  await page.goto("/families/new")
  await page.getByLabel("Family name").fill(`E2E ${stamp} A family of one`)
  await page.getByRole("button", { name: "Create family" }).click()
  await expect(page).toHaveURL(/\/families\/[0-9a-f-]{36}$/)
  const hint = page.locator('[data-tour-hint="invite"]')
  await expect(hint).toContainText("Send this link to your family")
  expect(await overflow(page)).toBe(0)
  const read = recorded(page, "hint_read")
  await hint.getByRole("button", { name: "Got it" }).click()
  await expect(hint).toHaveCount(0)
  await read

  // A fresh load of the same page: the steps are still running, and the hint stays gone.
  await page.goto(page.url())
  await expect(page.getByRole("button", { name: "Invite someone" })).toBeVisible()
  await expect(pill(page)).toBeVisible()
  await expect(hint).toHaveCount(0)
  expect((await backend.tourRow(loner))?.hints_read).toEqual(["invite"])
})

test("on their own: Not now leaves the pill", async ({ page }) => {
  await signIn(page, shy)
  await page.goto("/dashboard")
  const welcome = welcomeCard(page)
  await expect(welcome).toContainText("Welcome to Lumen")
  await page.getByRole("button", { name: "Not now" }).click()
  await expect(welcome).toHaveCount(0)
  await pill(page).click()
  const sheet = page.locator("[data-first-steps-panel]")
  for (const row of ["Add something you'd love", "Start your family", "Invite someone", "See how surprises stay secret"]) {
    await expect(sheet).toContainText(row)
  }
  await expect(sheet).toContainText("0 of 4 done")
})
