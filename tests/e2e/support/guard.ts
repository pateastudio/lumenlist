// The Neon `production` branch's endpoint id lives in its own file, so the public mirror can ship
// a copy without it. While it is empty the guard refuses every Neon database, so a missing value
// can't let a run through.
import { PROD_NEON_ENDPOINT } from "./prod-endpoint"

export { PROD_NEON_ENDPOINT }

// The e2e suite creates and deletes users. It must never run against production.
const PROD_HOSTS = new Set(["lumenlist.app", "www.lumenlist.app", "aws.lumenlist.app"])

export function assertSafeTarget(env: { baseURL: string }): void {
  if (PROD_HOSTS.has(new URL(env.baseURL).hostname)) {
    throw new Error("Refusing to run e2e tests against the production hostname.")
  }
}

export function assertSafeDatabase(url: string | undefined): void {
  if (!url) throw new Error("E2E_DATABASE_URL is not set; point it at the dev or staging Neon branch (owner, unpooled).")
  const host = new URL(url).hostname
  if (host === "localhost" || host === "127.0.0.1") return
  if (!PROD_NEON_ENDPOINT) {
    throw new Error("PROD_NEON_ENDPOINT is not set (tests/e2e/support/prod-endpoint.ts); refusing every Neon database until it is.")
  }
  const endpoint = host.split(".")[0].replace(/-pooler$/, "")
  if (endpoint === PROD_NEON_ENDPOINT) {
    throw new Error("Refusing to run e2e tests against the production Neon branch.")
  }
}

export function assertTestEmail(email: string): void {
  if (!/^[^@\s]+@resend\.dev$/.test(email)) {
    throw new Error(`Test emails must be @resend.dev addresses, got ${email}`)
  }
}
