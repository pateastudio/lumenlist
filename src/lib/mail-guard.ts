import { appEnv } from "./environment"

// Outside prod, mail goes only to NON_PROD_MAIL_TO (or to resend.dev test addresses), marked with
// the environment and the intended recipient. With no allowlist, nothing is sent.
export function guardRecipient(to: string, subject: string): { to: string; subject: string } | null {
  const env = appEnv()
  if (env === "prod") return { to, subject }
  if (/@resend\.dev$/i.test(to)) return { to, subject: `[${env}] ${subject}` }
  const allow = (process.env.NON_PROD_MAIL_TO ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
  if (allow.length === 0) return null
  if (allow.includes(to.toLowerCase())) return { to, subject: `[${env}] ${subject}` }
  return { to: allow[0], subject: `[${env}] ${subject} (for ${to})` }
}
