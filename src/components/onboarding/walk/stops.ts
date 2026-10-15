import { findAnchor, firstVisible } from "../anchors"
import { pickPerson } from "../tour-state"
import type { TourData } from "@/types/tour"

// The four stops of the walk and their words. Which stops a person gets
// depends on whether they were invited into a family or came in on their own.

export type WalkStep = {
  id: string
  /** The page this stop is on. The walk goes there by itself. */
  path: string
  /** Where to push to reach it (the path plus any query). */
  href: string
  /** The thing on the page the card points at. Null while it isn't there (yet). */
  find: () => HTMLElement | null
  title: string
  /** May depend on which fallback anchor was found. */
  body: (target: HTMLElement) => string
  /** Tapping the highlighted thing itself moves the walk on (only where that is what it does anyway). */
  clickable?: boolean
  /** The last stop is dressed up: it is the one people most need to believe. */
  tone?: "secret"
  next: string
}

/** What sits under the surprise note on someone's list when no gift or filter is there to point at. */
function emptyListCard(): HTMLElement | null {
  const el = findAnchor("their-surprise-note")?.nextElementSibling
  return el instanceof HTMLElement && el.getBoundingClientRect().height > 0 ? el : null
}

export const STEP_COUNT = 4

export function buildSteps(data: TourData): WalkStep[] {
  // The first person with something up for grabs, so stop 3 has an "I'll get this" to point at.
  const person = data.familyCount > 0 ? (pickPerson(data) ?? undefined) : undefined
  const mine: WalkStep = {
    id: "my-list",
    path: "/dashboard",
    href: "/dashboard",
    find: () => findAnchor("tab-mine"),
    title: "Your list lives here",
    body: () =>
      person
        ? "One list, just for you. Fill it with things you'd love, big or small. Everyone in your family can see it."
        : "One list, just for you. Fill it with things you'd love, big or small. Your family sees it once they join.",
    clickable: true,
    next: "Next",
  }
  const add: WalkStep = {
    id: "add-a-gift",
    path: "/gifts",
    href: "/gifts",
    find: () => findAnchor("list-add-gift"),
    title: "Adding a gift is quick",
    body: () => "Paste a link from a store and Lumen fills in the name and picture when it can. Or just type it in.",
    next: "Next",
  }

  if (!person) {
    return [
      mine,
      add,
      {
        id: "family",
        path: "/gifts",
        href: "/gifts",
        find: () => findAnchor("tab-family"),
        title: "Bring your people",
        // On their own in a family they already have (nobody has joined yet): there is nothing to start.
        body: () =>
          data.familyCount > 0
            ? "Lumen is better with your family in it. Open your family here and send everyone the link. It's free for them too."
            : "Lumen is better with your family in it. Start a family here, then send everyone the link. It's free for them too.",
        next: "Next",
      },
      {
        id: "surprise",
        path: "/dashboard",
        href: "/dashboard",
        find: () => findAnchor("home-surprise"),
        title: "Surprises stay secret",
        body: () =>
          "When someone picks a gift from your list, you can't see who. You can't even see that it was picked. It's the same for everyone and their own list.",
        tone: "secret",
        next: "Got it",
      },
    ]
  }

  const name = person.short
  const path = `/members/${person.id}`
  const href = person.href
  return [
    mine,
    add,
    {
      id: "pick",
      path,
      href,
      // An "I'll get this" button if anything is up for grabs, otherwise the filter above the gifts,
      // otherwise (a list with nothing on it yet) the "Nothing here yet" card under the surprise note.
      find: () =>
        firstVisible('[data-claim-state="available"] button') ??
        findAnchor("their-filter") ??
        emptyListCard(),
      title: `Pick something for ${name}`,
      body: (target) =>
        target.closest("[data-claim-state]")
          ? `This is what ${name} is hoping for. Tap “I'll get this” and it's yours to give. Everyone else sees it's taken, so nobody doubles up.`
          : target.matches('[data-tour="their-filter"]')
            ? `This is what ${name} is hoping for. When something is up for grabs, tap “I'll get this” and it's yours to give. Everyone else sees it's taken.`
            : `${name}'s list is empty for now. When something turns up, tap “I'll get this” and it's yours to give. Everyone else sees it's taken.`,
      next: "Next",
    },
    {
      id: "surprise",
      path,
      href,
      find: () => findAnchor("their-surprise-note"),
      title: `${name} can't see any of this`,
      body: () =>
        "Not who picked what. Not even that anything was picked. Your own list works the same way, so you can't peek either. Surprises stay secret.",
      tone: "secret",
      next: "Got it",
    },
  ]
}
