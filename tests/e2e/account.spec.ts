import { expect, test } from "./support/test"
import { backend, type TestUser } from "./support/backend"
import { testPassword } from "./support/passwords"
import { signIn, signOut } from "./support/session"

// A throwaway user, never a demo user: this spec changes its name and password.
test.describe.configure({ mode: "serial" })

let user: TestUser
const NEW_PASSWORD = testPassword()

test.beforeAll(async () => {
  user = await backend.createUser("account")
})
test.afterAll(async () => {
  await backend.deleteUser(user)
})

test("the account page shows the profile and the sign-out button", async ({ page }) => {
  await signIn(page, user, "/account")
  await page.goto("/account")
  await expect(page.getByRole("heading", { name: "Your account" })).toBeVisible()
  await expect(page.getByText(user.email)).toBeVisible()
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible()
})

test("changing the name shows a toast and the new name", async ({ page }) => {
  await signIn(page, user, "/account")
  await page.goto("/account")
  await page.getByLabel("Name", { exact: true }).fill("E2E Renamed")
  await page.getByRole("button", { name: "Save name" }).click()
  await expect(page.getByText("Name updated")).toBeVisible()
  await expect(page.getByText("E2E Renamed").first()).toBeVisible()
})

test("a wrong current password shows an inline error", async ({ page }) => {
  await signIn(page, user, "/account")
  await page.goto("/account")
  await page.getByLabel("Current password").fill("Wrong-Password-9!")
  await page.getByLabel("New password", { exact: true }).fill(NEW_PASSWORD)
  await page.getByLabel("Confirm new password").fill(NEW_PASSWORD)
  await page.getByRole("button", { name: "Change password" }).click()
  await expect(page.getByText("That's not your current password")).toBeVisible()
})

test("changing the password, then signing in with the new one", async ({ page }) => {
  await signIn(page, user, "/account")
  await page.goto("/account")
  await page.getByLabel("Current password").fill(user.password)
  await page.getByLabel("New password", { exact: true }).fill(NEW_PASSWORD)
  await page.getByLabel("Confirm new password").fill(NEW_PASSWORD)
  await page.getByRole("button", { name: "Change password" }).click()
  await expect(page.getByText("Password changed", { exact: false })).toBeVisible()
  await signOut(page)

  user = { ...user, password: NEW_PASSWORD }
  await signIn(page, user)
  await expect(page).toHaveURL(/\/dashboard/)
})

test("sign out from the account page locks the app", async ({ page }) => {
  await signIn(page, user, "/account")
  await page.goto("/account")
  await page.getByRole("button", { name: "Sign out" }).click()
  await expect(page).toHaveURL(/\/login/)
  await page.goto("/dashboard")
  await expect(page).toHaveURL(/\/login/)
})
