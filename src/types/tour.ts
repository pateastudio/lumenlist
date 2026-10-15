// The onboarding tour (#98), as the browser sees it. Plain data: safe to pass from the server
// layout to client components.

/** "invited": they share a family with someone. "solo": nobody to share with yet. */
export type TourTrack = "invited" | "solo"

/** The in-place hints, one per step that happens on a page. */
export type HintId = "add" | "dibs" | "invite"

/** Someone they share a family with, and how many of that person's gifts are up for grabs. */
export type TourPerson = { id: string; name: string; familyId: string; openCount: number }

export type TourData = {
  userId: string
  /** The short name the app greets them with. */
  firstName: string
  /** Gifts on their own list. Never anything about who is getting them. */
  giftCount: number
  familyCount: number
  firstFamily: { id: string; name: string } | null
  /** Gifts they have said they'll get. */
  claimCount: number
  people: TourPerson[]
}

export type TourState = {
  /** The walk was finished or skipped. */
  walkEnded: boolean
  /** They opened someone's list themselves, after the walk. */
  peeked: boolean
  /** They opened the surprise explainer. */
  secretSeen: boolean
  hintsRead: HintId[]
  /** The steps were all done, or hidden. */
  stepsEnded: boolean
  /** Chosen when the steps first show; null until then. */
  track: TourTrack | null
  /** They asked for the tour again from Account and the walk hasn't ended yet. */
  replay: boolean
}

/** `run` changes when the tour is restarted, so the client can start from a clean slate. */
export type TourInfo = { over: true; run: string } | { over: false; run: string; state: TourState; data: TourData }
