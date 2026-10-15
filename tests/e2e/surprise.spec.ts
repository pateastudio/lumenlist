// The core promise: a gift owner never learns who claimed or bought their gifts. Checked three
// ways: the UI, the app's API, and the database itself (as the owner, through RLS).
import type { APIRequestContext, Page } from "@playwright/test"
import { expect, settling, test } from "./support/test"
import { backend, type TestUser } from "./support/backend"
import { signIn } from "./support/session"

test.describe.configure({ mode: "serial" })

let owner: TestUser     // wants the gift
let claimer: TestUser   // same family, claims it
let sibling: TestUser   // same family, should see it is taken
let outsider: TestUser  // shares no family with the owner
let familyId: string
let giftId: string
const title = `E2E Secret ${Date.now().toString(36)}`

async function giftIdByTitle(request: APIRequestContext, t: string): Promise<string> {
  const res = await request.get("/api/gifts")
  expect(res.ok()).toBe(true)
  const { gifts } = await res.json()
  return gifts.find((g: { title: string }) => g.title === t).id
}

async function joinFamily(page: Page, joinPath: string) {
  await page.goto(joinPath)
  await page.getByRole("button", { name: "Join family" }).click()
  await expect(page).toHaveURL(new RegExp(`/families/${familyId}$`))
}

test.beforeAll(async ({ browser }) => {
  owner = await backend.createUser("sp-owner")
  claimer = await backend.createUser("sp-claimer")
  sibling = await backend.createUser("sp-sibling")
  outsider = await backend.createUser("sp-outsider")

  const ctx = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] })
  const page = settling(await ctx.newPage())
  await signIn(page, owner)
  await page.goto("/families/new")
  await page.getByLabel("Family name").fill(`E2E SP ${Date.now().toString(36)}`)
  await page.getByRole("button", { name: "Create family" }).click()
  await expect(page).toHaveURL(/\/families\/[0-9a-f-]{36}$/)
  familyId = page.url().split("/").pop()!
  await page.goto(`/families/${familyId}/settings`)
  // The share link lives in the invite sheet (#107, #109).
  await page.getByRole("button", { name: "Invite someone" }).click()
  await page.getByRole("button", { name: /copy invite link/i }).click()
  const joinPath = new URL(await page.evaluate(() => navigator.clipboard.readText())).pathname

  await page.goto("/gifts/new")
  await page.getByPlaceholder("e.g. Blue knit sweater").fill(title)
  await page.getByRole("button", { name: "Add to my list" }).click()
  await expect(page).toHaveURL(/\/gifts$/)
  giftId = await giftIdByTitle(page.request, title)
  await ctx.close()

  for (const u of [claimer, sibling]) {
    const c = await browser.newContext()
    const p = settling(await c.newPage())
    await signIn(p, u)
    await joinFamily(p, joinPath)
    await c.close()
  }
})

test.afterAll(async () => {
  for (const u of [claimer, sibling, outsider, owner]) await backend.deleteUser(u)
})

test("a family member claims the gift, then marks it purchased", async ({ page }) => {
  await signIn(page, claimer)
  await page.goto(`/members/${owner.id}`)
  await page.getByRole("button", { name: "I'll get this" }).click()
  await expect(page.getByText(/It's yours! .* won't know/)).toBeVisible()
  await page.getByRole("button", { name: "I bought it" }).click()
  await expect(page.getByText("Marked as bought. Nice work!")).toBeVisible()
  await expect(page.getByText("You bought this", { exact: true })).toBeVisible()
})

test("the claim UI is marked, so the owner's negative check means something", async ({ page }) => {
  await signIn(page, claimer)
  await page.goto(`/members/${owner.id}`)
  // Wait for the list itself: the loading skeleton (no markers) renders first.
  await expect(page.getByText(title)).toBeVisible()
  await expect(page.locator("[data-claim-state]").first()).toBeVisible()
})

test("another family member sees that it is taken", async ({ page }) => {
  await signIn(page, sibling)
  await page.goto(`/members/${owner.id}`)
  await expect(page.getByText("Already bought", { exact: true })).toBeVisible()
  // Someone else's claim has no actions: no disabled button.
  await expect(page.getByRole("button", { name: /get this|bought it|changed my mind|undo/i })).toHaveCount(0)
})

test("UI: the owner's list shows no claim", async ({ page }) => {
  await signIn(page, owner)
  await page.goto("/gifts")
  await expect(page.getByText(title)).toBeVisible()
  // Every claim chip and action container carries data-claim-state (status-chip.tsx, claim-actions.tsx),
  // so this holds even if the labels change. The claimer's page has it (see the control above).
  await expect(page.locator("[data-claim-state]")).toHaveCount(0)
  // And the exact labels a claim shows.
  await expect(page.getByText(/^(You're getting this|You bought this|Someone's on it|Already bought|Up for grabs)$/)).toHaveCount(0)
  // Visiting their own member page redirects to /gifts, so it can't show claims either.
  await page.goto(`/members/${owner.id}`)
  await expect(page).toHaveURL(/\/gifts$/)
})

test("API: no endpoint gives the owner claim data", async ({ page }) => {
  await signIn(page, owner)
  for (const path of ["/api/gifts", `/api/gifts?userId=${owner.id}`, `/api/gifts/${giftId}`]) {
    const res = await page.request.get(path)
    expect(res.ok(), path).toBe(true)
    const text = await res.text()
    expect(text, path).not.toContain(claimer.id)
    expect(text, path).not.toMatch(/"status"\s*:\s*"(claimed|purchased)"/)
  }
})

test("database: RLS hides the claim from the owner and shows it to the family", async () => {
  expect(await backend.claimsVisibleTo(owner, giftId)).toBe(0)
  expect(await backend.claimsVisibleTo(claimer, giftId)).toBe(1)
  expect(await backend.claimsVisibleTo(sibling, giftId)).toBe(1)
  expect(await backend.claimsVisibleTo(outsider, giftId)).toBe(0)
})

test("an outsider can't read the gift or the owner's list", async ({ page }) => {
  await signIn(page, outsider)
  const one = await page.request.get(`/api/gifts/${giftId}`)
  expect(one.status()).toBe(404)
  const list = await page.request.get(`/api/gifts?userId=${owner.id}`)
  expect(await list.text()).not.toContain(title)
})

test("the owner can't claim their own gift through the API", async ({ page }) => {
  await signIn(page, owner)
  const res = await page.request.post(`/api/gifts/${giftId}/claim`, { data: { status: "claimed" } })
  expect(res.status()).toBe(403)
})
