import { expect, type Page } from "@playwright/test"
import type { TestUser } from "./backend"

export async function signIn(page: Page, user: TestUser, path = "/login"): Promise<void> {
  await page.goto(path)
  await page.getByLabel("Email").fill(user.email)
  await page.getByLabel("Password").fill(user.password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).not.toHaveURL(/\/login/)
}

export async function signOut(page: Page): Promise<void> {
  await page.getByRole("button", { name: "User menu" }).first().click()
  await page.getByRole("menuitem", { name: "Sign out" }).click()
  await expect(page).toHaveURL(/\/login/)
}
