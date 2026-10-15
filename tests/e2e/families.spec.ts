import type { Page } from "@playwright/test"
import { expect, test } from "./support/test"
import { backend, type TestUser } from "./support/backend"
import { signIn, signOut } from "./support/session"

test.describe.configure({ mode: "serial" })

let owner: TestUser
let joiner: TestUser
let invitee: TestUser
let familyId: string
let joinUrl: string
const familyName = `E2E Family ${Date.now().toString(36)}`

test.beforeAll(async () => {
  owner = await backend.createUser("fam-owner")
  joiner = await backend.createUser("fam-joiner")
  invitee = await backend.createUser("fam-invitee")
})
test.afterAll(async () => {
  for (const u of [owner, joiner, invitee]) await backend.deleteUser(u)
})

async function createFamily(page: Page, name: string): Promise<string> {
  await page.goto("/families/new")
  await page.getByLabel("Family name").fill(name)
  await page.getByRole("button", { name: "Create family" }).click()
  await expect(page).toHaveURL(/\/families\/[0-9a-f-]{36}$/)
  return page.url().split("/").pop()!
}

test("an owner creates a family and sees themselves as its only member", async ({ page }) => {
  await signIn(page, owner)
  familyId = await createFamily(page, familyName)
  await expect(page.getByRole("heading", { name: familyName })).toBeVisible()
  await expect(page.getByText(owner.name)).toBeVisible()
})

test("the owner copies a shareable join link from the invite sheet", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"])
  await signIn(page, owner)
  await page.goto(`/families/${familyId}`)
  await page.getByRole("button", { name: "Invite someone" }).click()
  await page.getByRole("button", { name: /copy invite link/i }).click()
  await expect(page.getByText("Link copied!")).toBeVisible()
  joinUrl = await page.evaluate(() => navigator.clipboard.readText())
  expect(joinUrl).toMatch(/\/join\/[a-f0-9]{32}$/)
})

test("an anonymous visitor to the join link sees the family and sign-in choices", async ({ page }) => {
  await page.goto(new URL(joinUrl).pathname)
  await expect(page.getByRole("heading", { name: `Join ${familyName}` })).toBeVisible()
  await expect(page.getByRole("link", { name: "I already have an account" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Create my account" })).toBeVisible()
})

test("a signed-in user joins through the link, even with the code upper-cased", async ({ page }) => {
  await signIn(page, joiner)
  const path = new URL(joinUrl).pathname
  const code = path.split("/").pop()!
  await page.goto(`/join/${code.toUpperCase()}`)
  await page.getByRole("button", { name: "Join family" }).click()
  await expect(page).toHaveURL(new RegExp(`/families/${familyId}$`))
  await expect(page.getByText(joiner.name)).toBeVisible()
})

test("a non-owner has no settings link but can invite", async ({ page }) => {
  await signIn(page, joiner)
  await page.goto(`/families/${familyId}`)
  await expect(page.getByRole("button", { name: "Invite someone" })).toBeVisible()
  await expect(page.locator(`a[href="/families/${familyId}/settings"]`)).toHaveCount(0)
})

test("the owner invites by email and the invitee accepts", async ({ page }) => {
  await signIn(page, owner)
  await page.goto(`/families/${familyId}`)
  await page.getByRole("button", { name: "Invite someone" }).click()
  await page.getByPlaceholder("family@example.com").fill(invitee.email)
  await page.getByRole("button", { name: "Send invite" }).click()
  await expect(page.getByText(`Invite sent to ${invitee.email}`)).toBeVisible()
  await page.keyboard.press("Escape")
  await signOut(page)

  const token = await backend.inviteToken(familyId, invitee.email)
  await page.goto(`/invite/${token}`)
  await expect(page.getByRole("heading", { name: "You're invited!" })).toBeVisible()

  await signIn(page, invitee)
  await page.goto(`/invite/${token}`)
  await page.getByRole("button", { name: "Accept invitation" }).click()
  await expect(page).toHaveURL(new RegExp(`/families/${familyId}$`))
  await expect(page.getByText(invitee.name)).toBeVisible()
})

test("only the owner can reset the join link, and the old link stops working", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"])
  await signIn(page, joiner)
  await page.goto(`/families/${familyId}`)
  await page.getByRole("button", { name: "Invite someone" }).click()
  await expect(page.getByRole("button", { name: /copy invite link/i })).toBeVisible()
  await expect(page.getByRole("button", { name: "Reset link" })).toHaveCount(0)
  await page.keyboard.press("Escape")
  await signOut(page)

  await signIn(page, owner)
  await page.goto(`/families/${familyId}`)
  await page.getByRole("button", { name: "Invite someone" }).click()
  await page.getByRole("button", { name: "Reset link" }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Reset link" }).click()
  await expect(page.getByText("New link ready. The old one no longer works.")).toBeVisible()
  await expect(page.getByText(joinUrl)).toHaveCount(0)
  await page.getByRole("button", { name: /copy invite link/i }).click()
  const newUrl = await page.evaluate(() => navigator.clipboard.readText())
  expect(newUrl).toMatch(/\/join\/[a-f0-9]{32}$/)
  expect(newUrl).not.toBe(joinUrl)

  await page.goto(new URL(joinUrl).pathname)
  await expect(page.getByRole("heading", { name: "Invite not found" })).toBeVisible()
  await page.goto(new URL(newUrl).pathname)
  await expect(page.getByRole("heading", { name: `Join ${familyName}` })).toBeVisible()
})

test("an invalid invite token shows an error page", async ({ page }) => {
  await page.goto("/invite/thisisaninvalidtoken")
  await expect(page.getByRole("heading", { name: "Invite not found" })).toBeVisible()
})
