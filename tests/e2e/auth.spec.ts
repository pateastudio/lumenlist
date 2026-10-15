import { expect, test } from "./support/test"
import { backend, testEmail, type TestUser } from "./support/backend"
import { testPassword } from "./support/passwords"
import { signIn, signOut } from "./support/session"

test.describe.configure({ mode: "serial" })

let user: TestUser
const signupEmail = testEmail("signup")

test.beforeAll(async () => {
  user = await backend.createUser("auth")
})
test.afterAll(async () => {
  await backend.deleteUser(user)
  await backend.deleteUserByEmail(signupEmail)
})

test("an anonymous visitor to / sees the marketing page, and Sign in takes them to /login", async ({ page }) => {
  await page.goto("/")
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole("heading", { level: 1 })).toContainText("A little list.")
  await page.getByRole("navigation", { name: "Account" }).getByRole("link", { name: "Sign in" }).click()
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible()
})

test("signup asks the user to check their email", async ({ page }) => {
  await page.goto("/signup")
  await page.getByLabel("Name").fill("E2E Signup")
  await page.getByLabel("Email").fill(signupEmail)
  await page.getByLabel("Password").fill(testPassword())
  await page.getByRole("button", { name: "Create account" }).click()
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible()
})

test("signing up again with the same email looks identical (anti-enumeration)", async ({ page }) => {
  await page.goto("/signup")
  await page.getByLabel("Name").fill("E2E Signup")
  await page.getByLabel("Email").fill(signupEmail)
  await page.getByLabel("Password").fill(testPassword())
  await page.getByRole("button", { name: "Create account" }).click()
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible()
})

// Better Auth answers an existing email with a synthetic user shaped exactly like a new
// sign-up's, so the response can't tell the two apart: same status, same fields, no session, and
// nothing real about the existing account (its id, its verified state).
test("the signup API answers the same for new and existing emails", async ({ request }) => {
  const body = (email: string) => ({ data: { name: "E2E", email, password: testPassword() } })
  const existing = await request.post("/api/auth/sign-up/email", body(user.email))
  const fresh = await request.post("/api/auth/sign-up/email", body(testEmail("signup-api")))
  expect(existing.status()).toBe(fresh.status())
  const [e, f] = [await existing.json(), await fresh.json()]
  expect(Object.keys(e).sort()).toEqual(Object.keys(f).sort())
  expect(Object.keys(e.user).sort()).toEqual(Object.keys(f.user).sort())
  expect(e.token).toBeNull()
  expect(f.token).toBeNull()
  expect(e.user.id).not.toBe(user.id)
  expect(e.user.emailVerified).toBe(false) // the real account is verified
  await backend.deleteUserByEmail(testEmail("signup-api"))
})

test("forgot password answers the same for unknown emails", async ({ page }) => {
  await page.goto("/forgot-password")
  await page.getByLabel("Email").fill(testEmail("nobody"))
  await page.getByRole("button", { name: "Send reset link" }).click()
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible()
})

test("login with a wrong password stays on /login and shows an error", async ({ page }) => {
  await page.goto("/login")
  await page.getByLabel("Email").fill(user.email)
  await page.getByLabel("Password").fill("Wrong-Password-1!")
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page.getByRole("alert").filter({ hasText: "Invalid email or password" })).toBeVisible()
  await expect(page).toHaveURL(/\/login/)
})

test("login lands on the dashboard, and sign out locks the app again", async ({ page }) => {
  await signIn(page, user)
  await expect(page).toHaveURL(/\/dashboard/)
  await signOut(page)
  await page.goto("/dashboard")
  await expect(page).toHaveURL(/\/login/)
})

test("login returns the user to the page they asked for", async ({ page }) => {
  await page.goto("/gifts")
  await expect(page).toHaveURL(/\/login\?next=%2Fgifts|\/login\?next=\/gifts/)
  await page.getByLabel("Email").fill(user.email)
  await page.getByLabel("Password").fill(user.password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL(/\/gifts$/)
})

test("an unknown page renders a 404, not an error", async ({ page }) => {
  const res = await page.goto("/this-page-does-not-exist")
  expect(res?.status()).toBe(404)
})
