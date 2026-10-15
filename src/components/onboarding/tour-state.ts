import { shortName } from "@/lib/format"
import type { TourEvent } from "@/lib/validations"
import type { HintId, TourData, TourPerson, TourState, TourTrack } from "@/types/tour"

// The onboarding tour's rules, with no React and no browser in them, so they can be tested alone.

export type Phase = "walk" | "steps" | "over"

/** The walk always comes first. The steps follow until they are done or hidden. */
export function phaseOf(state: TourState): Phase {
  if (!state.walkEnded) return "walk"
  return state.stepsEnded ? "over" : "steps"
}

const START: TourState = { walkEnded: false, peeked: false, secretSeen: false, hintsRead: [], stepsEnded: false, track: null, replay: false }

/** What the server will have after this event: the browser shows it at once and sends it behind. */
export function applyEvent(state: TourState, event: TourEvent): TourState {
  switch (event.event) {
    case "walk_completed":
    case "walk_skipped":
      return { ...state, walkEnded: true, replay: false }
    case "steps_shown":
      return { ...state, track: state.track ?? event.track }
    case "peeked":
      return { ...state, peeked: true }
    case "secret_seen":
      return { ...state, secretSeen: true }
    case "hint_read":
      return state.hintsRead.includes(event.id) ? state : { ...state, hintsRead: [...state.hintsRead, event.id] }
    case "steps_completed":
    case "steps_hidden":
      return { ...state, stepsEnded: true }
    case "restart":
      // The walk and the steps run again. What they did themselves stays done.
      return { ...START, peeked: state.peeked, secretSeen: state.secretSeen, replay: true }
  }
}

/**
 * The server's state and this tab's, joined. Within one run nothing is ever undone, so either
 * side saying "yes" is enough: a refresh that hasn't caught up can't un-tick what this tab did,
 * and a tour finished on another device stays finished here. (A restart is a new run: the
 * provider is remounted for it and never merges across runs.)
 */
export function mergeState(server: TourState, local: TourState): TourState {
  const walkEnded = server.walkEnded || local.walkEnded
  const hints: HintId[] = [...server.hintsRead]
  for (const h of local.hintsRead) if (!hints.includes(h)) hints.push(h)
  return {
    walkEnded,
    peeked: server.peeked || local.peeked,
    secretSeen: server.secretSeen || local.secretSeen,
    hintsRead: hints,
    stepsEnded: server.stepsEnded || local.stepsEnded,
    track: server.track ?? local.track,
    replay: (server.replay || local.replay) && !walkEnded,
  }
}

export function trackFor(data: TourData): TourTrack {
  return data.people.length > 0 ? "invited" : "solo"
}

/** Whose list the tour uses: the first person with something up for grabs, else the first person. */
export function pickPerson(data: TourData): (TourPerson & { short: string; href: string }) | null {
  const person = data.people.find((p) => p.openCount > 0) ?? data.people[0]
  return person ? { ...person, short: shortName(person.name) || person.name, href: `/members/${person.id}?familyId=${person.familyId}` } : null
}

export type TaskId = "add" | "peek" | "family" | "invite" | "dibs" | "secret"

export type Task = {
  id: TaskId
  title: string
  /** One short line under the title while the task is still to do. */
  sub: string
  done: boolean
  /** Where the task happens. Null for the explainer (it opens in the sheet) and for a task that has to wait. */
  href: string | null
  /** True when an earlier task has to come first. Shown, never tappable, never the "next" row. */
  waiting?: boolean
}

/**
 * Four tasks, ticked from real data wherever the data can say, and otherwise only from what the
 * person did themselves (`peeked`, `secretSeen`). The walk ticks nothing.
 */
export function buildTasks(data: TourData, track: TourTrack, state: TourState): Task[] {
  const person = pickPerson(data)
  const familyHref = data.firstFamily ? `/families/${data.firstFamily.id}` : null

  const add: Task = { id: "add", title: "Add something you'd love", sub: "One thing is plenty to start your list.", done: data.giftCount > 0, href: "/gifts/new" }
  const secret: Task = { id: "secret", title: "See how surprises stay secret", sub: "A ten-second look. No reading required.", done: state.secretSeen, href: null }

  if (track === "solo") {
    return [
      add,
      { id: "family", title: "Start your family", sub: "Give it a name. That's the whole job.", done: data.familyCount > 0, href: "/families/new" },
      {
        id: "invite",
        title: "Invite someone",
        sub: familyHref ? "One link is all it takes." : "Right after you start your family.",
        done: data.people.length > 0,
        href: familyHref,
        waiting: !familyHref,
      },
      secret,
    ]
  }

  return [
    add,
    { id: "peek", title: person ? `Peek at ${person.short}'s list` : "Peek at someone's list", sub: "See what they're hoping for.", done: state.peeked, href: person?.href ?? "/families" },
    {
      id: "dibs",
      title: "Call dibs on a gift",
      sub: person ? `Pick one for ${person.short}. They won't know.` : "Pick one from someone's list. They won't know.",
      done: data.claimCount > 0,
      href: person?.href ?? "/families",
    },
    secret,
  ]
}

const WORDS = ["None", "One", "Two", "Three", "Four"]
export const countWord = (n: number) => WORDS[n] ?? String(n)
