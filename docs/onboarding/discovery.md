# Onboarding tour: discovery (issue #98, with #3)

**The tour shipped** (October 2026) as the walk plus First Steps: a welcome, four stops on the real screens, then a short checklist. What was built is in `docs/superpowers/specs/2026-10-12-onboarding-tour-design.md`, how it was built is in `docs/superpowers/plans/2026-10-12-onboarding-tour.md`, and how it works now is the "Onboarding tour" section of `CODEBASE.md`. The prototypes and the Tour lab described below were never merged: they exist only on the unmerged branch `feature/98-onboarding-prototypes`.

The rest of this page is the record of the discovery, left as it was written: what a first-time
user met before the tour, what the research says about tours, the technical options, and the
prototype directions. "Today" below means before the tour.

---

## 1. What a first-time user meets today

Two kinds of people arrive, and they see different things.

| | Invited (most people) | On their own (the organizer) |
|---|---|---|
| How they arrive | `/join/<code>` or `/invite/<token>`: three `HowLumenWorks` bullets, create an account, verify by email, sign in, join | `/signup`, verify by email, sign in |
| Where they land | The family page, `/families/<id>` | `/dashboard` |
| What they see | A family full of other people's lists, and an empty list of their own | Three empty states: nothing to shop for, no people, no family |
| The one thing they should do next | Add a few gifts, then look at someone's list | Create a family and invite people (or add gifts first) |
| Demo account (dev seed) | Aunt Priya, `delivered+demo-priya@resend.dev` | Robin Vale, `delivered+demo-robin@resend.dev` (added for this work) |

Findings:

- **Nobody is welcomed.** Home says "Welcome back" on the very first visit.
- **The surprise rule is explained only in passing**: one bullet on the invite page, a small note at
  the bottom of Home, a banner on other people's lists. Issue #3 asks for it to be explained before
  first use. It is the thing people most need to believe.
- **The empty states already teach.** "Your list is empty, for now!", "You're not shopping for anyone
  yet" and "No family yet" each say what to do and offer the button. A tour should lean on them, not
  repeat them.
- **Nothing remembers a person's progress.** `profiles` has no column for it, and there is no
  per-user settings table. The theme is kept in `localStorage`, per device.
- **Replay has an obvious home**: the Account page (`/account`), next to "Look and feel".
- Backend notes, not touched: `Promise.all` over one transaction logs pg's "client is already
  executing a query" deprecation warning (Home does the same; it will break in pg 9).

## 2. What the research says

- **Up-front tutorials don't help much.** NN/g tested 70 users on four mobile apps: people who read
  the tutorial succeeded no more often (91% against 94%) and rated tasks as harder.
  <https://www.nngroup.com/articles/mobile-tutorials/>
- **Help in context beats help in advance.** NN/g: up-front tours are frequently skipped; prefer help
  that appears when the person's activity calls for it, easy to dismiss and to bring back.
  <https://www.nngroup.com/articles/onboarding-tutorials/>
- **Short and self-started.** Chameleon's 2025 benchmark: four-step tours complete best, with a sharp
  drop at five; tours a person starts themselves complete about twice as often (67% against 31%).
  <https://www.chameleon.io/benchmark-report>

So: a welcome that offers the tour instead of forcing it, four steps at most, empty states and
in-place hints doing the rest, and a way back in from Account.

## 3. Technical options (checked 2026-10-11)

| Option | Licence | Size and dependencies | Our own React card? | Multi-page | Verdict |
|---|---|---|---|---|---|
| Dice UI Tour, Base UI variant (shadcn registry: `shadcn add @diceui/tour`) | MIT | Copied source, about 1,800 lines; no new packages (Base UI and floating-ui are already installed) | Yes, it is our code | We write a small route controller | **First choice** for a spotlight tour |
| react-joyride 3.2 | MIT | 25.6 kB gzip, 10 dependencies | Yes (`tooltipComponent`) | Documented recipe | **Fallback** |
| driver.js 1.9 | MIT | 7.6 kB, none | No: its own DOM, styled by CSS | We write it | Third: can't reuse Card and Button, a second stylesheet per theme |
| NextStep, Onborda | MIT | Need `motion` / `framer-motion` | Yes | Built in | Out: animation dependency, little accessibility |
| Reactour | MIT | 7.2 kB | Yes | We write it | Out: 17 months without a release |
| Shepherd.js, Intro.js | AGPL-3.0 | | | | Out: licence |
| Tour Kit | BUSL-1.1 | | | | Out: licence |
| Hosted tools (Appcues, Userpilot, Frigade) | | Third-party scripts | | | Out: monthly cost, family data sent to a vendor |

A checklist or a welcome dialog needs no tour library at all: shadcn `Card`, `Progress`, `Dialog`
or `Sheet` are enough.

Not verified: behaviour of any of these at 390px with our fixed bars (source reading only), and
Next 16 specifically (no library declares it).

## 4. Where "has seen the tour" should live

**Recommendation: a per-user flag in the database** (for example `profiles.onboarding_completed_at`
plus a small version number), set on finish and on skip; Account's replay ignores it.
`localStorage` alone would show the tour again on every new phone and after cleared data, and the
people this is for are the least likely to understand why. The prototypes use `localStorage`
(`src/components/onboarding/tour-store.ts`) so that no schema changes during exploration. The real
build needs a migration, a data function and a route or server action; that is a backend change
to agree first.

## 5. Prototype directions

Under `pnpm dev`, sign in and use the "Tour lab" chip (top right) to switch variant or to
"pretend it's my first visit". Account has "Show me around again".

All three offer rather than force, stop at four steps, handle both kinds of newcomer from real
data, resume after a reload, can be skipped, and restart from Account.

| | Guided Walk | First Steps | Welcome Cards |
|---|---|---|---|
| Pattern | A welcome card, then four spotlight pointers across the real screens | A small to-do pill and sheet: four real tasks ticked from real data, plus one hint in place where a task happens | Four full-screen cards before the app, each with a small working demo, then one hand-off |
| The four | My list tab, Add a gift, pick something for someone (or "bring your people"), the surprise note | Add something you'd love, peek at someone's list (or start a family, invite someone), call dibs, see how surprises stay secret | Welcome and your family, Make your list, Pick what you'll give, Surprises stay secret |
| How the surprise rule lands | Last step, pointing at the real note on someone's list | A ten-second explainer inside the sheet, and a line on the welcome | The final card: "What you see / What they see", reacting to what you tapped |
| Built with | Dice UI Tour (Base UI) from the shadcn registry, `src/components/ui/tour.tsx`, plus our own page-to-page controller | shadcn `Sheet`, `Progress`, Base UI `Dialog` parts, floating-ui for the hint. No tour library | shadcn `Dialog` and our own pager. No tour library |
| Fits the research | Fine: offered, four steps | Best: help in context, self-paced | Weakest on paper (an up-front tutorial), but 30 seconds, skippable, and you do each thing in miniature |
| Strength | Shows where things really are | Never lies (ticks are real), keeps helping for days, quiet when closed | The warmest hello; the clearest telling of the surprise rule; nothing anchored, so nothing to misplace on a phone |
| Risk | Most fragile: depends on anchors, page loads and what is on someone's list; blocks the page while it runs | A pill on every page until finished; more moving parts; "peek" and "secret" ticks need storing | Stands between the person and the app; teaches with examples, not their own screens |
| Build cost | Highest (1,800 lines of generated tour code to own, plus the controller) | Medium | Lowest |

They also combine. The obvious pairing is Welcome Cards for the first thirty seconds, then First
Steps as the quiet follow-through; Guided Walk's welcome card could instead offer either.

Found along the way, for the real build whichever is chosen:

- Home should not say "Welcome back" on a first visit.
- The tour needs to know which person has something up for grabs, so "pick something for…" never
  lands on an empty list. That is one more thing for the single onboarding query.
- Invited people land on the family page after joining, not Home. First-run must start there.
- `shortName()` gives "Aunt Priya", so greetings read "Welcome to Lumen, Aunt Priya."
- The dev seed still has "Grandma Rose", which shows up wherever a tour uses real names.

## 6. Walk + Steps (2026-10-12)

Patrick preferred Guided Walk to Welcome Cards and asked whether the walk and First Steps can run
together. `variants/walk-and-steps` does that, as the lab's default:

- One welcome (the walk's). First Steps' own welcome never shows.
- Nothing of the checklist is on screen during the walk.
- The walk's last card points at the First Steps pill: "Now, your first steps" with "Show my first
  steps" and "Later".
- "Not now", Skip or Escape ends the walk only; the pill is left, collapsed.
- The walk never ticks a step. Seeing it on the tour is not doing it: every step is still there to
  do in their own time, and the in-place hints still show. (At first the walk pre-ticked "peek" and
  "surprises" as "Seen on the tour."; Patrick asked for this instead on 2026-10-12.) The list the walk
  leaves them on does not count as a peek until they go to a list themselves.
- One status: the tour is finished when the checklist is, or hidden with "Hide these steps".
- Guided Walk and First Steps take an optional `embed` prop for this; alone they behave as before
  (same script, same log, before and after).

What is awkward about it, to weigh before building it for real:

- **For an invited person the checklist is thin after the walk.** Aunt Priya arrives at 3 of 4 with
  one job left, "Add something you'd love", which a single button on the walk's last card could do.
  It earns its keep for people on their own (three jobs left: add a gift, start a family, invite).
- "Seen on the tour" is a generous tick: watching a card about picking is not picking.
- The hand-off card dims and blocks the page once more, to point at a pill.
- Escape means three things across the phases; "Hide these steps" records the tour as skipped even
  if the walk was finished. The real build should separate "tour seen" from "steps hidden".

**Decided 2026-10-12:** both parts for everyone, and the walk does not count toward the steps. That
answers the thin-checklist worry above: an invited person now has three steps left after the walk
(Aunt Priya has one ticked only because she had already called dibs).
