# Marketing page: discovery (issue #97)

> **What happened next.** The page shipped at `/` as **Quiet Cover**: a calm cover, a gingham
> blanket with the real cards to play with, and four steps acted out on a phone. `CODEBASE.md`
> ("Marketing page") describes it as built. Six prototypes were made along the way (the three
> directions below, then three mixes of them). They exist only on the unmerged branch
> `feature/97-marketing-prototypes`; `/marketing-lab` is not in this codebase. The rest of this
> file is the discovery as it was written, before any change to the live site.

What a signed-out visitor sees today, which app moments are worth showing, the voice the app
already has, and the three prototype directions. Written before any change to the live site: `/`
still redirects, and the prototypes run only under `pnpm dev` at `/marketing-lab`.

---

## 1. What a signed-out visitor sees today

| They open | What happens | What they learn about Lumen |
|---|---|---|
| `/` (`lumenlist.app`) | `src/app/page.tsx` redirects to `/login` | Nothing |
| `/login` | `AuthFrame`: logo, "Sign in", "Welcome back. Your family's lists are waiting.", the form, "Don't have an account? Sign up" | That families and lists are involved, and that's all |
| `/signup` | "Create an account", "It takes a minute, and it's free. Then share your list with family." | One line more |
| `/forgot-password`, `/reset-password` | Password reset | Nothing |
| Any signed-in path (`/dashboard`, `/gifts`, `/families`, `/members`, `/account`) | `src/proxy.ts` redirects to `/login?next=<path>` | Nothing |
| `/join/<code>`, `/invite/<token>` | The only pages that explain the product: family name, three `HowLumenWorks` bullets, "Create my account" / "I already have an account" | The whole idea, but only if someone invited them |
| Anything else | Root `not-found.tsx`: "We couldn't find that page", Go home (which lands on `/login`) | Nothing |

The page metadata description ("Share gift lists with your family. Surprises stay secret.") is the
best one-line pitch the product has, and no visitor ever sees it on a page.

Notes for the real build (nothing changed yet):

- `/` is where the marketing page goes: signed-out visitors get the page, signed-in ones keep the
  redirect to `/dashboard`. `tests/e2e/auth.spec.ts` asserts `/` lands on `/login` and will change with it.
- `/` is not in the proxy's protected list, so the page needs no proxy change. It should be static
  (no session read in the page itself would be ideal; today's redirect reads the session).
- Invited people never need the marketing page: their links already land on a page that explains
  Lumen and keeps `?next=`. The marketing page only needs one line pointing them back to their link.
- Backend note, not touched: an anonymous call to a protected API route gets a redirect to `/login`
  rather than a 401 (`tests/e2e/gifts.spec.ts` already notes it).

## 2. The moments worth showing

| Moment | Where it lives | Why it sells |
|---|---|---|
| **Claiming a gift** | `TheirGiftCard` + `ClaimActions` on `/members/[userId]` | The core action. One tap, the chip flips to "You're getting this", and the toast says "It's yours! Nora won't know. 🤫" |
| **The two views of one list** | `/members/[userId]` (family's view) against `/gifts` (`OwnGiftCard`, no claim data) | The surprise guarantee, shown instead of promised. Nothing else in the category demonstrates it this plainly |
| **Browsing someone's list** | `TheirGiftList`: All / Up for grabs / Mine, the five chip states, the details sheet | Shows the app is real, full and friendly at a glance |
| **Keeping track of what you're buying** | "You're shopping for" on `/dashboard`: progress bar, Mark bought | The organizer's payoff: no spreadsheet, no group text |
| The family hub | `/families/[familyId]`: avatar stack, "Everyone's lists" | Supporting: "your people, in one place" |
| Adding a gift by pasting a link | `GiftForm` on `/gifts/new` | Supporting, as copy only: the scrape calls the API, so it can't run on a public page |

## 3. The voice the app already has

Plain words, short sentences, a little wit, written to one person.

- Actions: "I'll get this", "I bought it", "Changed my mind", "Add a gift", "Invite someone", "Keep it", "Yes, let it go"
- States: "Up for grabs", "You're getting this", "You bought this", "Someone's on it", "Already bought"
- Reassurance: "Surprises stay secret.", "Nora can't see any of this.", "You'll never see who's getting what.", "Nobody sees who's getting what from their own list."
- Warmth: "things you'd love", "Your family's lists are waiting.", "It takes a minute, and it's free.", "Your list is empty, for now!", "Marked as bought. Nice work! 🎉"
- Errors: "Couldn't claim that. Try again." (never "Failed to")
- Names: **Lumen**; "my list" / "Nora's list"; "gifts"; "family". Never "wishlist", "registry" or "Lumen List".

## 4. How the previews work

The prototypes render the app's real components on the made-up Harper family from
`scripts/seed-dev.ts`, as fixtures (`src/app/marketing-lab/_demo/`). No database, no session, no
network.

- `ClaimActions` reads an optional `ClaimTransportContext` (`src/components/gifts/claim-transport.ts`).
  With no provider it behaves exactly as before. `<DemoFamily>` provides one that changes the
  fixture claims in memory, so claiming, marking bought and changing your mind all work for a
  signed-out visitor. This is the only change to an existing app file.
- Gift pictures are emoji as SVG data URIs, so the real `GiftImage` renders them with no photo
  rights and no requests to other sites. (The dev seed's `picsum.photos` pictures are random
  photos and would look wrong on a public page.)
- The owner's view (`OwnGiftCard`) is shown inert: its menu calls the API.
- The `/members/[userId]` header and surprise note live in the page file, so `_demo/their-list.tsx`
  copies them. The real build should move them into a component both can use.

## 5. Directions

Prototypes at `/marketing-lab` under `pnpm dev` (404 on every deployed environment). All three
use the same fixtures and real components, only theme tokens, the same header, calls to action
("Start your family's list" to `/signup`, "I already have an account" to `/login`) and the line for
invited people. Each page ends with its own prototype notes.

| | Picnic Blanket | Peek Inside | Story Time |
|---|---|---|---|
| Route | `/marketing-lab/picnic-blanket` | `/marketing-lab/peek-inside` | `/marketing-lab/story-time` |
| Headline | "Everyone gets something they'll love. Nobody gets two." | "The gift list your whole family will actually use." | "A little list. A big surprise." |
| Hero | Gingham blanket with real cards tossed on it, tilted, taped and pinned | A Picnic-style phone in 3D running Nora's real list | Storybook cover: big type on cream, one tilted real card |
| Preview idea | Tap any card: it straightens and comes forward, and a claim shows up in the "You're shopping for" card | Claim a gift, then flip the phone to see Nora's side; a coach caption leads Pick, Flip, Secret | Five chapters on a sticky stage as you scroll; chapter 3 is a live "I'll get this" |
| Supporting sections | Three taped steps, "Same gift. Two very different views.", occasion stickers | "Three things. That's it.", live "Keep track without a spreadsheet", FAQ | "Made for the days that matter", "Getting started is easy" |
| Motion | Pieces drop in, straighten on hover or tap, drift with the pointer | Pointer tilt, half-turn flip with a hop; cross-fade under reduced motion | Page-turn between chapters, CSS confetti at the end; stacked chapters without JavaScript |
| Wins over | The visitor who decides in five seconds from how it looks | The organizer who has to trust it before inviting everyone | The invited relative who wants it explained slowly and kindly |
| Biggest risk | The surprise guarantee is one section among several | Asks the visitor to do something before it pays off; busiest on a phone | Longest page; the payoff takes scrolling to reach |
| Build cost | Medium: hand-placed collage per breakpoint | Highest: phone, flip, coach, three live sections | Medium: scroll logic and five scenes |

Rough edges common to all three, for the real build:

- The "You're shopping for" card, the family header and the `/members/[userId]` header exist only
  inside page files. Extract them so the marketing page and the app share one copy.
- `TheirGiftList`'s grid follows the window width. Inside a narrow frame it needs a container query.
- Toasts, the details sheet and the confirm dialog open over the whole page, as in the app.
- Store buttons on preview cards open the fixture URLs. The real page should drop or disable them.
- Checked in Chromium only, at 390px and 1280px, in all three themes.

## 6. Round two: combinations

Patrick's feedback on round one (2026-10-11): no single direction wins. Keep five things: the
gingham, the cards that follow the cursor, the phone with the other person's side, the plain Story
Time hero, and steps instead of chapters. He did not want "Picnic Blanket's hero with the flip as a
section below". Also: the example person is Nora, not a grandparent; links on example cards must not
work; the primary colour is royal blue.

Three mixes, each keeping all five and differing in where they live:

| | Quiet Cover | Phone at the Picnic | Step by Step |
|---|---|---|---|
| Route | `/marketing-lab/mix-quiet-cover` | `/marketing-lab/mix-phone-picnic` | `/marketing-lab/mix-step-by-step` |
| Headline | "A little list. A big surprise." | "Everyone gets something they'll love. Nobody gets two." | "Gift lists for your family. Surprises stay secret." |
| Hero | Plain, on cream, with the blanket's hem at the bottom edge | One scene: words on a cream panel, the live phone on gingham, loose cards around it | Plain, on cream, one card that leans toward the cursor |
| Gingham and cursor cards | Their own room: "Go on. Help yourself." | In the hero, around the phone | Step 2, "Peek at everyone else's", with a card from each Harper |
| Phone | Sticky stage for four steps; flips between Nora's phone and yours | Hero centrepiece with the "You see / Nora sees" flip and a short coach note | Step 3 (live claim), then two phones side by side in step 4 |
| Steps | Four, scroll-told on the phone | Four short static notes | Four full panels with a sticky steps bar and a stitched thread |
| Strength | Each idea gets room; the flip is the payoff of the steps | Everything on the first desktop screen; shortest page | Reads as one page; always clear where you are; ordinary scrolling |
| Risk | Longest; the steps need JavaScript; small phone on phones | Busiest first screen; on a phone the scene is below the fold | No flip (two phones instead); the playful parts wait until step 2 |
