// The dev seed writes a whole demo family, so it reuses the e2e guard and refuses anything but the
// Neon dev branch (or a local database): never the production branch, never a prod hostname.
import { assertSafeDatabase, assertSafeTarget, PROD_NEON_ENDPOINT } from "../../tests/e2e/support/guard"

export function assertSeedTarget(env: { ownerUrl?: string; appUrl?: string; baseURL?: string }): void {
  assertSafeDatabase(env.ownerUrl)
  if (!env.appUrl) throw new Error("E2E_APP_DATABASE_URL is not set; point it at the dev branch's app_user (pooled).")
  assertSafeDatabase(env.appUrl)
  if (env.baseURL) assertSafeTarget({ baseURL: env.baseURL })
}

// The demo seed (scripts/seed-demo.ts) is the one seed that may write to production, for the
// demo video, and only when asked to by name. The flag and the branch must agree both ways, so
// neither a stray URL nor a stray flag gets through.
export function demoTarget(env: { ownerUrl?: string; production: boolean }): "prod" | "other" {
  if (!env.ownerUrl) throw new Error("DEMO_DATABASE_URL is not set; give it the branch's owner URL (unpooled).")
  const host = new URL(env.ownerUrl).hostname
  const isProd = host.split(".")[0].replace(/-pooler$/, "") === PROD_NEON_ENDPOINT
  if (isProd && !env.production) throw new Error("Target is the production Neon branch; pass --production to seed the demo families there.")
  if (!isProd && env.production) throw new Error("--production was given, but the target is not the production Neon branch.")
  return isProd ? "prod" : "other"
}
