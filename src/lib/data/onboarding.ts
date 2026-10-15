import { and, count, eq, inArray, isNull, ne, sql } from "drizzle-orm"
import { giftClaims, gifts, onboarding } from "@/db/schema"
import type { Tx } from "@/lib/db"
import { fellowMembers, listMyFamilies } from "@/lib/data/families"
import { shortName } from "@/lib/format"
import type { TourEvent } from "@/lib/validations"
import type { Onboarding } from "@/types"
import type { HintId, TourInfo, TourState } from "@/types/tour"

const HINTS: readonly string[] = ["add", "dibs", "invite"]

function toState(row: Onboarding | undefined): TourState {
  return {
    walkEnded: !!row?.walk_ended_at,
    peeked: !!row?.peeked_at,
    secretSeen: !!row?.secret_seen_at,
    hintsRead: (row?.hints_read ?? []).filter((h): h is HintId => HINTS.includes(h)),
    stepsEnded: !!row?.steps_ended_at,
    track: row?.steps_track ?? null,
    replay: !!row?.restarted_at && !row.walk_ended_at,
  }
}

/**
 * What the (app) layout needs for the onboarding tour. For anyone who has finished, this is one
 * primary-key read and nothing else. While the tour is running it also loads the counts the
 * checklist ticks from, and who in their families has something up for grabs.
 *
 * Surprise preservation: the up-for-grabs count joins claims only for OTHER people's gifts, read
 * through RLS as this viewer. The viewer's own gifts are counted and nothing more.
 */
export async function getTour(tx: Tx, userId: string, name: string): Promise<TourInfo> {
  const [row] = await tx.select().from(onboarding).where(eq(onboarding.user_id, userId))
  const run = row?.restarted_at ?? ""
  if (row?.walk_ended_at && row.steps_ended_at) return { over: true, run }

  // One after another: these share the transaction's single connection.
  const [{ n: giftCount }] = await tx.select({ n: count() }).from(gifts).where(eq(gifts.owner_id, userId))
  const families = await listMyFamilies(tx, userId)
  const [{ n: claimCount }] = await tx.select({ n: count() }).from(giftClaims).where(eq(giftClaims.claimed_by, userId))
  const fellows = await fellowMembers(tx, userId, 50)

  // fellowMembers returns one row per shared family: keep each person once.
  const seen = new Set<string>()
  const others = fellows.filter((m) => !seen.has(m.user_id) && seen.add(m.user_id))
  const ids = others.map((m) => m.user_id)
  const open = ids.length
    ? await tx
        .select({ owner: gifts.owner_id, n: count() })
        .from(gifts)
        .leftJoin(giftClaims, eq(giftClaims.gift_id, gifts.id))
        .where(and(inArray(gifts.owner_id, ids), ne(gifts.owner_id, userId), isNull(giftClaims.id)))
        .groupBy(gifts.owner_id)
    : []
  const openBy = new Map(open.map((r) => [r.owner, r.n]))

  return {
    over: false,
    run,
    state: toState(row),
    data: {
      userId,
      firstName: shortName(name.trim()) || "there",
      giftCount,
      familyCount: families.length,
      firstFamily: families[0] ? { id: families[0].id, name: families[0].name } : null,
      claimCount,
      people: others.map((m) => ({ id: m.user_id, name: m.profiles.name || "Someone", familyId: m.family_id, openCount: openBy.get(m.user_id) ?? 0 })),
    },
  }
}

/**
 * Records one thing that happened in the tour. The database sets every time, and every event is
 * safe to send twice: the first outcome wins, so a late or repeated request changes nothing.
 */
export async function recordTourEvent(tx: Tx, userId: string, event: TourEvent): Promise<void> {
  await tx.insert(onboarding).values({ user_id: userId }).onConflictDoNothing()
  const o = onboarding
  const set = (() => {
    switch (event.event) {
      case "walk_completed":
      case "walk_skipped": {
        const outcome = event.event === "walk_completed" ? "completed" : "skipped"
        return { walk_ended_at: sql`coalesce(${o.walk_ended_at}, now())`, walk_outcome: sql`coalesce(${o.walk_outcome}, ${outcome}::text)` }
      }
      case "steps_shown":
        return { steps_track: sql`coalesce(${o.steps_track}, ${event.track}::text)` }
      case "peeked":
        return { peeked_at: sql`coalesce(${o.peeked_at}, now())` }
      case "secret_seen":
        return { secret_seen_at: sql`coalesce(${o.secret_seen_at}, now())` }
      case "hint_read":
        return { hints_read: sql`case when ${event.id}::text = any(${o.hints_read}) then ${o.hints_read} else array_append(${o.hints_read}, ${event.id}::text) end` }
      case "steps_completed":
      case "steps_hidden": {
        const outcome = event.event === "steps_completed" ? "completed" : "hidden"
        return { steps_ended_at: sql`coalesce(${o.steps_ended_at}, now())`, steps_outcome: sql`coalesce(${o.steps_outcome}, ${outcome}::text)` }
      }
      case "restart":
        // The walk and the steps run again, and the hints show again for what is still to do.
        // What they did themselves (peeked_at, secret_seen_at) stays: a replay undoes nothing.
        return {
          walk_ended_at: null, walk_outcome: null,
          hints_read: sql`'{}'::text[]`, steps_ended_at: null, steps_outcome: null, steps_track: null,
          restarted_at: sql`now()`,
        }
    }
  })()
  await tx.update(onboarding).set({ ...set, updated_at: sql`now()` }).where(eq(onboarding.user_id, userId))
}
