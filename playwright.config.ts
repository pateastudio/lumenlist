import { defineConfig, devices } from "@playwright/test"
import { assertSafeDatabase, assertSafeTarget } from "./tests/e2e/support/guard"

// Local runs read settings from .env.local (the dev Neon branch).
try {
  process.loadEnvFile(".env.local")
} catch {
  // CI or a deployed target provides the environment instead.
}

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000"
assertSafeTarget({ baseURL })
assertSafeDatabase(process.env.E2E_DATABASE_URL)

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : // A production build, not `next dev`: it is what users get, and Next 16's dev server ignores
      // a root-level middleware.ts when the app lives under src/.
      { command: "pnpm build && pnpm start", url: baseURL, reuseExistingServer: true, timeout: 300_000 },
})
