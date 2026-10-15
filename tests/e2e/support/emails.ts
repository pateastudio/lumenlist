import { assertTestEmail } from "./guard"

// One id per test process, so parallel or repeated runs never collide.
const RUN = process.env.E2E_RUN_ID ?? Date.now().toString(36)

export function testEmail(label: string): string {
  const email = `delivered+e2e-${RUN}-${label}@resend.dev`
  assertTestEmail(email)
  return email
}
