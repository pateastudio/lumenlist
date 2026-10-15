import { expect, test } from "./support/test"
import { backend, type TestUser } from "./support/backend"
import { signIn } from "./support/session"

test.describe.configure({ mode: "serial" })

let user: TestUser
const title = `E2E Mug ${Date.now().toString(36)}`

test.beforeAll(async () => {
  user = await backend.createUser("gifts")
})
test.afterAll(async () => {
  await backend.deleteUser(user)
})

test("a user adds a gift by hand and sees it on their list", async ({ page }) => {
  await signIn(page, user)
  await page.goto("/gifts/new")
  await page.getByPlaceholder("e.g. Blue knit sweater").fill(title)
  await page.getByPlaceholder("49.99").fill("19.99")
  await page.getByRole("button", { name: "Add to my list" }).click()
  await expect(page.getByText("Gift added to your list")).toBeVisible()
  await expect(page).toHaveURL(/\/gifts$/)
  await expect(page.getByText(title)).toBeVisible()
})

test("a user removes a gift from the options menu after confirming", async ({ page }) => {
  await signIn(page, user)
  await page.goto("/gifts")
  await page.getByRole("button", { name: `Options for ${title}` }).click()
  await page.getByRole("menuitem", { name: "Remove" }).click()
  const dialog = page.getByRole("alertdialog")
  await expect(dialog).toContainText(title)
  await dialog.getByRole("button", { name: "Keep it" }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible()

  await page.getByRole("button", { name: `Options for ${title}` }).click()
  await page.getByRole("menuitem", { name: "Remove" }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Remove" }).click()
  await expect(page.getByText("Removed from your list.")).toBeVisible()
  await expect(page.getByRole("heading", { name: title, exact: true })).toHaveCount(0)
})

test("a very long title does not widen the page", async ({ page }) => {
  await signIn(page, user)
  await page.goto("/gifts/new")
  await page.getByPlaceholder("e.g. Blue knit sweater").fill("Long ".repeat(39) + "end")
  await page.getByRole("button", { name: "Add to my list" }).click()
  await expect(page).toHaveURL(/\/gifts$/)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  expect(overflow).toBe(false)
})

// Today the proxy redirects an anonymous API call to /login; a route that answers 401 itself is
// just as good. Either way no gift data comes back.
test("the gifts API refuses an anonymous caller", async ({ request }) => {
  const res = await request.get("/api/gifts", { maxRedirects: 0 })
  if (res.status() === 401) return
  expect(res.status()).toBe(307)
  expect(res.headers()["location"]).toMatch(/\/login/)
  expect(await res.text()).not.toContain('"gifts"')
})
