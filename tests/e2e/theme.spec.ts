import { expect, test } from "./support/test"
import { backend, type TestUser } from "./support/backend"
import { signIn } from "./support/session"

// A throwaway user, never a demo user.
test.describe.configure({ mode: "serial" })

let user: TestUser

test.beforeAll(async () => {
  user = await backend.createUser("theme")
})
test.afterAll(async () => {
  await backend.deleteUser(user)
})

test("the default theme is Sunday Picnic, and choosing Confetti survives a reload", async ({ page }) => {
  await signIn(page, user, "/account")
  await page.goto("/account")
  const html = page.locator("html")
  await expect(html).toHaveAttribute("data-theme", "picnic")

  const picnic = page.getByRole("radio", { name: /Sunday Picnic/ })
  const confetti = page.getByRole("radio", { name: /Confetti/ })
  await expect(picnic).toHaveAttribute("aria-checked", "true")

  await confetti.click()
  await expect(html).toHaveAttribute("data-theme", "confetti")
  await expect(confetti).toHaveAttribute("aria-checked", "true")

  await page.reload()
  await expect(html).toHaveAttribute("data-theme", "confetti")
  await expect(page.getByRole("radio", { name: /Confetti/ })).toHaveAttribute("aria-checked", "true")
})

test("choosing Patea sets data-theme and survives a reload, and Picnic stays the default", async ({ page }) => {
  await signIn(page, user, "/account")
  await page.goto("/account")
  const html = page.locator("html")
  await page.evaluate(() => localStorage.removeItem("lumen-theme"))
  await page.reload()
  await expect(html).toHaveAttribute("data-theme", "picnic")

  const patea = page.getByRole("radio", { name: /Patea/ })
  await expect(page.getByRole("radio")).toHaveCount(3)
  await patea.click()
  await expect(html).toHaveAttribute("data-theme", "patea")
  await expect(patea).toHaveAttribute("aria-checked", "true")

  await page.reload()
  await expect(html).toHaveAttribute("data-theme", "patea")
  await expect(page.getByRole("radio", { name: /Patea/ })).toHaveAttribute("aria-checked", "true")
  await expect(page.getByRole("radio", { name: /Sunday Picnic/ })).toHaveAttribute("aria-checked", "false")
})
