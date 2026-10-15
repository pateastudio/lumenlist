import { NextResponse } from "next/server"
import { clientIp } from "@/lib/client-ip"
import { takeRateLimit } from "@/lib/data/rate-limits"
import type { Tx } from "@/lib/db"
import { appEnv } from "@/lib/environment"

// The app's own rate limits, for the routes Better Auth's limiter doesn't cover (it guards only
// /api/auth). Counters live in Postgres (app_rate_limit), so every Lambda instance shares them.
//
// Per-user and per-family limits run in every environment: tests make a fresh user and family
// each time, so they never reach them, and dev and staging run the same code as prod. Per-IP
// limits run in prod only, like Better Auth's: outside prod the only visitors are Patrick and the
// e2e suite from one address, and a local run has no CloudFront, so everyone is 127.0.0.1.
//
// The numbers are generous for a family passing a link around and tight for anyone guessing
// codes or using us to send email. A 12-character code is 48 random bits and a new one is 122,
// so at 30 previews per 15 minutes guessing gets nowhere either way.
type Rule = { key: string; limit: number; windowSeconds: number; ipOnly?: boolean }

const MINUTE = 60
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export const LIMITS = {
  /** Opening /join/<code>, signed in or out. */
  joinPreview: (ip: string): Rule[] => [
    { key: `join-preview:ip:${ip}`, limit: 30, windowSeconds: 15 * MINUTE, ipOnly: true },
  ],
  /** Joining through a link. */
  join: (ip: string, userId: string): Rule[] => [
    { key: `join:user:${userId}`, limit: 10, windowSeconds: 15 * MINUTE },
    { key: `join:ip:${ip}`, limit: 20, windowSeconds: 15 * MINUTE, ipOnly: true },
  ],
  /** Sending an invite email. */
  invite: (ip: string, userId: string, familyId: string): Rule[] => [
    { key: `invite:user:${userId}`, limit: 10, windowSeconds: HOUR },
    { key: `invite:user-day:${userId}`, limit: 30, windowSeconds: DAY },
    { key: `invite:family-day:${familyId}`, limit: 20, windowSeconds: DAY },
    { key: `invite:ip:${ip}`, limit: 20, windowSeconds: HOUR, ipOnly: true },
  ],
}

/** The rules that apply here: per-IP ones only in prod. */
export function activeRules(rules: Rule[], env = appEnv()): Rule[] {
  return env === "prod" ? rules : rules.filter((r) => !r.ipOnly)
}

/**
 * Counts one hit on every rule that applies. Returns null when all are within their limits, or
 * the seconds to wait. Every rule counts even after one is over, so a blocked caller can't save
 * up hits on another key. Run it in the same transaction as the work it guards.
 */
export async function hitLimits(tx: Tx, rules: Rule[]): Promise<number | null> {
  let wait = 0
  for (const r of activeRules(rules)) {
    const { allowed, retryAfter } = await takeRateLimit(tx, r.key, r.limit, r.windowSeconds)
    if (!allowed) wait = Math.max(wait, retryAfter)
  }
  return wait > 0 ? wait : null
}

/** The trusted client IP for a request (src/lib/client-ip.ts), or null to refuse it. */
export function requestIp(headers: Headers): string | null {
  const resolved = clientIp(headers, process.env.ORIGIN_VERIFY_SECRET)
  return "reject" in resolved ? null : resolved.ip
}

export const TOO_MANY_MESSAGE = "Too many tries. Wait a few minutes and try again."

export function tooManyRequests(retryAfter: number): NextResponse {
  return NextResponse.json(
    { error: TOO_MANY_MESSAGE },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  )
}

export function forbidden(): NextResponse {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}
