// Someone's list: the gift details sheet and the All / Up for grabs / Mine filter.
import { expect, settling, test } from "./support/test"
import { backend, type TestUser } from "./support/backend"
import { signIn } from "./support/session"

test.describe.configure({ mode: "serial" })

let owner: TestUser
let viewer: TestUser
let familyId: string
const stamp = Date.now().toString(36)
const free = `E2E Free ${stamp}`
const mineGift = `E2E Mine ${stamp}`
const notes = `Full notes ${stamp}: ` + "a long note that would be clamped on the card. ".repeat(8) + "THE END"

test.beforeAll(async ({ browser }) => {
  owner = await backend.createUser("tl-owner")
  viewer = await backend.createUser("tl-viewer")

  const ctx = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] })
  const page = settling(await ctx.newPage())
  await signIn(page, owner)
  await page.goto("/families/new")
  await page.getByLabel("Family name").fill(`E2E TL ${stamp}`)
  await page.getByRole("button", { name: "Create family" }).click()
  await expect(page).toHaveURL(/\/families\/[0-9a-f-]{36}$/)
  familyId = page.url().split("/").pop()!
  await page.goto(`/families/${familyId}/settings`)
  await page.getByRole("button", { name: "Invite someone" }).click()
  await page.getByRole("button", { name: /copy invite link/i }).click()
  const joinPath = new URL(await page.evaluate(() => navigator.clipboard.readText())).pathname
  for (const [t, d] of [[free, notes], [mineGift, "short"]]) {
    const res = await page.request.post("/api/gifts", { data: { title: t, description: d } })
    expect(res.ok()).toBe(true)
  }
  await ctx.close()

  const c = await browser.newContext()
  const p = settling(await c.newPage())
  await signIn(p, viewer)
  await p.goto(joinPath)
  await p.getByRole("button", { name: "Join family" }).click()
  await expect(p).toHaveURL(new RegExp(`/families/${familyId}$`))
  await c.close()
})

test.afterAll(async () => {
  for (const u of [viewer, owner]) await backend.deleteUser(u)
})

test("the details sheet shows the full notes and closes with Escape", async ({ page }) => {
  await signIn(page, viewer)
  await page.goto(`/members/${owner.id}`)
  const trigger = page.getByRole("button", { name: `${free}, details` })
  await trigger.click()
  const sheet = page.getByRole("dialog")
  await expect(sheet.getByRole("heading", { name: free })).toBeVisible()
  await expect(sheet).toContainText("THE END")
  await page.keyboard.press("Escape")
  await expect(sheet).toBeHidden()
  await expect(trigger).toBeFocused()
})

test("claiming from inside the sheet works, and Keep it leaves the sheet open", async ({ page }) => {
  await signIn(page, viewer)
  await page.goto(`/members/${owner.id}`)
  await page.getByRole("button", { name: `${mineGift}, details` }).click()
  const sheet = page.getByRole("dialog")
  await sheet.getByRole("button", { name: "I'll get this" }).click()
  await expect(page.getByText(/It's yours! .* won't know/)).toBeVisible()
  await expect(sheet.getByText("You're getting this", { exact: true })).toBeVisible()

  await sheet.getByRole("button", { name: "Changed my mind" }).click()
  const confirm = page.getByRole("alertdialog")
  await expect(confirm).toBeVisible()
  await confirm.getByRole("button", { name: "Keep it" }).click()
  await expect(confirm).toBeHidden()
  await expect(sheet.getByRole("button", { name: "I bought it" })).toBeVisible()
})

test("the filter shows All, Up for grabs and Mine", async ({ page }) => {
  await signIn(page, viewer)
  await page.goto(`/members/${owner.id}`)
  const cards = (t: string) => page.getByRole("button", { name: `${t}, details` })
  await expect(cards(free)).toBeVisible()
  await expect(cards(mineGift)).toBeVisible()

  await page.getByRole("button", { name: "Up for grabs", exact: true }).click()
  await expect(cards(free)).toBeVisible()
  await expect(cards(mineGift)).toHaveCount(0)

  await page.getByRole("button", { name: "Mine", exact: true }).click()
  await expect(cards(mineGift)).toBeVisible()
  await expect(cards(free)).toHaveCount(0)

  // Deselecting the active item is ignored, and a claim action keeps the filter.
  await page.getByRole("button", { name: "Mine", exact: true }).click()
  await expect(cards(mineGift)).toBeVisible()
  await page.getByRole("button", { name: "I bought it" }).click()
  await expect(page.getByText("You bought this", { exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Mine", exact: true })).toHaveAttribute("aria-pressed", "true")
  await expect(cards(free)).toHaveCount(0)

  await page.getByRole("button", { name: "All", exact: true }).click()
  await expect(cards(free)).toBeVisible()
})
