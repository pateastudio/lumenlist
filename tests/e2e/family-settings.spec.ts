import { expect, settling, test } from "./support/test"
import { backend, type TestUser } from "./support/backend"
import { signIn } from "./support/session"

// Throwaway users and a throwaway family; never the demo family.
test.describe.configure({ mode: "serial" })

let owner: TestUser
let member: TestUser
let familyId: string
let joinPath: string
const stamp = Date.now().toString(36)
const familyName = `Settings Fam ${stamp}`
const renamed = `Renamed Fam ${stamp}`

test.beforeAll(async () => {
  owner = await backend.createUser("set-owner")
  member = await backend.createUser("set-member")
})
test.afterAll(async () => {
  for (const u of [owner, member]) await backend.deleteUser(u)
})

test("setup: the owner creates a family and a member joins by link", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"])
  await signIn(page, owner)
  await page.goto("/families/new")
  await page.getByLabel("Family name").fill(familyName)
  await page.getByRole("button", { name: "Create family" }).click()
  await expect(page).toHaveURL(/\/families\/[0-9a-f-]{36}$/)
  familyId = page.url().split("/").pop()!
  await page.getByRole("button", { name: "Invite someone" }).click()
  await page.getByRole("button", { name: /copy invite link/i }).click()
  joinPath = new URL(await page.evaluate(() => navigator.clipboard.readText())).pathname

  const other = await context.browser()!.newContext()
  const p2 = settling(await other.newPage())
  await signIn(p2, member)
  await p2.goto(joinPath)
  await p2.getByRole("button", { name: "Join family" }).click()
  await expect(p2).toHaveURL(new RegExp(`/families/${familyId}$`))
  await other.close()
})

test("a non-owner sees a read-only settings page", async ({ page }) => {
  await signIn(page, member)
  await page.goto(`/families/${familyId}/settings`)
  await expect(page.getByRole("heading", { name: `${familyName} settings` })).toBeVisible()
  await expect(page.getByText("Only the family owner can change these settings")).toBeVisible()
  await expect(page.getByText(owner.name)).toBeVisible()
  await expect(page.getByLabel("Family name")).toHaveCount(0)
  await expect(page.getByRole("button", { name: /^Remove/ })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Delete this family" })).toHaveCount(0)
})

test("the owner renames the family", async ({ page }) => {
  await signIn(page, owner)
  await page.goto(`/families/${familyId}/settings`)
  await page.getByLabel("Family name").fill(renamed)
  await page.getByRole("button", { name: "Save" }).click()
  await expect(page.getByText("Family renamed")).toBeVisible()
  await expect(page.getByRole("heading", { name: `${renamed} settings` })).toBeVisible()
})

test("the owner removes a member, who then no longer sees the family", async ({ page, browser }) => {
  await signIn(page, owner)
  await page.goto(`/families/${familyId}/settings`)
  await expect(page.getByRole("button", { name: `Remove ${member.name}` })).toBeVisible()
  await page.getByRole("button", { name: `Remove ${member.name}` }).click()
  await expect(page.getByRole("alertdialog")).toContainText(`Remove ${member.name} from ${renamed}?`)
  await page.getByRole("alertdialog").getByRole("button", { name: "Remove" }).click()
  await expect(page.getByText(`${member.name} was removed`)).toBeVisible()
  await expect(page.getByRole("button", { name: `Remove ${member.name}` })).toHaveCount(0)

  const ctx = await browser.newContext()
  const p2 = settling(await ctx.newPage())
  await signIn(p2, member)
  await p2.goto(`/families/${familyId}`)
  await expect(p2.getByText("We couldn't find that page")).toBeVisible()
  await ctx.close()
})

test("the owner deletes the family after typing its name", async ({ page }) => {
  await signIn(page, owner)
  await page.goto(`/families/${familyId}/settings`)
  await page.getByRole("button", { name: "Delete this family" }).click()
  const dialog = page.getByRole("alertdialog")
  const confirm = dialog.getByRole("button", { name: "Delete family" })
  await expect(confirm).toBeDisabled()
  await dialog.getByLabel(/to confirm/).fill(renamed)
  await expect(confirm).toBeEnabled()
  await confirm.click()
  await expect(page).toHaveURL(/\/families$/)
  await page.goto(`/families/${familyId}`)
  await expect(page.getByText("We couldn't find that page")).toBeVisible()
})
