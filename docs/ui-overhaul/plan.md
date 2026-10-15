> **Status: done.** All tasks below are complete. The design lab (`src/app/design-lab/`, the
> `/design-lab` prototypes) was removed in task 16; its history lives in git (PR #92 added it).
> This file and `discovery.md` are kept as history. Links to the prototypes below point at code
> that no longer exists.

# UI overhaul: implementation plan (issue #54)

**Direction: Sunday Picnic**, the default for everyone. **Confetti** comes later as an optional theme
that people can pick on their Account page (tasks 13 and 14). Prototypes (removed): `/design-lab/picnic`
and `/design-lab/confetti`. Issue numbers (G1, M3…) refer to `discovery.md`.

Each task below is one pull request into `develop`, small enough for one subagent and one review.
Suggested models: **Sonnet** for anything with judgment or several screens, **Haiku** for
mechanical work with a clear spec.

---

## Rules for every task

Give these to the subagent along with its task.

1. **UI only.** Don't touch `src/lib/data`, `src/lib/db`, `src/db`, `drizzle/`, API routes or
   `src/lib/validations.ts` (the API routes validate with the same schemas, so changing one changes
   the backend). Calling an API that already exists is fine.
2. **Read first:** `AGENTS.md`, `CODEBASE.md`, this file, the task's issues in `discovery.md`, and the
   matching prototype in `src/app/design-lab/_components/`. The prototype shows the look, not code
   to copy: real components use real data and the app's patterns.
3. **Only use theme values; never hard-code a color, font or shadow.** Every color, font, radius,
   border and shadow comes from a token in `globals.css` (task 1). Never write a Picnic-specific
   value such as `border-[#23212B]` or `shadow-[4px_4px_0_…]` into a component, so Confetti can
   switch it later.
4. **shadcn components come from the CLI** (`pnpm exec shadcn add <name>`). Don't overwrite
   `button.tsx` or `form.tsx` (answer "no" to the overwrite prompt).
5. **App conventions:** every `<Link>` in the signed-in area sets `prefetch={false}`; pages get
   the user with `getCurrentUser()`; forms use `react-hook-form` and `zod` with the schemas in
   `validations.ts`; toasts use `sonner`.
6. **Phones first.** Everything works at 390px wide with no horizontal scroll. Touch targets are at
   least 44px tall. No fixed multi-column grid without a breakpoint; grids use `grid-cols-1` (which
   lets columns shrink) on phones.
7. **JSX spaces:** a text chunk that follows a tag or `{expression}`, contains an entity like
   `&apos;` and runs to a line break loses its leading space (G13). Write `{" "}` explicitly.
8. **Checks before the PR:**
   - `pnpm typecheck`, `pnpm lint`, `pnpm test` and `pnpm build` pass.
   - Screenshots of every changed screen at 390px and 1280px go in the PR.
   - If the task changes text or labels that `tests/e2e` uses, update those specs in the same PR
     and run them (`pnpm test:e2e` against the dev branch).
9. **Docs:** update `CODEBASE.md` for any new component, route or design decision.
10. **Delivery:**
    - Branch `ui-overhaul-NN-<slug>` from `develop`, PR into `develop`, squash merge.
    - Merges deploy to dev (`dev.lumenlist.app`).
    - Prod gets nothing until a release is cut, so the half-restyled app is only ever seen on dev.

---

## Order

```
00 ─► 01 ─► 02 ─► 03 ─┬─► 05a ─► 05b ─► 05c      (claim flow)
            │         ├─► 06 ─► 07               (my list, gift form)
            │         ├─► 08                     (dashboard)
            │         ├─► 09 ─► 10               (families)
            │         ├─► 11                     (account)
            │         └─► 12                     (sign-in, invites)
            └─► 04                                (loading, errors)
all screens ─► 13 ─► 14 ─► 15 ─► 16
```

Tasks on separate branches of the tree can run in parallel once task 03 is merged.

---

## Tasks

### 00 · Merge the discovery work (no subagent)
- **What:** open the `ui-overhaul` branch as a PR into `develop`: the audit doc, the plan, the
  design lab and the new shadcn components. Squash merge.
- **Done when:** `/design-lab` works under `pnpm dev` and returns 404 on every deployed environment (dev, staging, prod). It holds prototypes nobody outside the team should see.

### 01 · Theme foundation · Sonnet
- **What:** move the Sunday Picnic tokens from `design-lab/_directions.ts` into `globals.css`.
  Picnic sits on `:root` as the default, and also under `[data-theme="picnic"]`. Add tokens for
  everything that differs between themes:
  - `--font-display`, `--font-sans`
  - `--radius`
  - `--border-strong` (Picnic's ink outline)
  - `--shadow-card` and `--shadow-button` (Picnic's offset shadows)
  - `--hero`
  - `--tone-0..3-bg` and `--tone-0..3-fg`
  - `--success`
  - `--destructive-foreground` (fixes G12)
- **Fonts:** replace Inter and Instrument Serif with Bricolage Grotesque and DM Sans in
  `src/app/layout.tsx`.
- **Old styles:** remap the old `ds-*` and `--ink*` / `--surface*` variables onto the new tokens so
  every existing screen keeps working and shifts toward Picnic colors. Don't restyle any markup.
- **Done when:**
  - Every existing page renders with no layout change, just new colors and fonts.
  - Contrast of `--muted-foreground` on `--background` and on `--card` is at least 4.5:1 (G9).
- **Watch:** the design lab sets its own tokens on `<body>`; check that it still looks right.

### 02 · Shared building blocks · Sonnet
- **What:** in `src/components/shared/`, build the pieces every screen reuses, all styled from
  tokens:
  - `PageHeader` (title, subtitle, actions; stacks on phones)
  - `BackLink`
  - `PersonAvatar` (shows `avatar_url` when set, initials in a stable tone otherwise; fixes G11)
  - `GiftImage` (product image, or an emoji/icon tile in a tone when there's none)
  - `StatusChip`
  - `EmptyState`
  - `formatPrice()` in `src/lib/format.ts`, with a unit test (fixes L9)
- **Cards and buttons:** add an `ink` treatment, used by default, so cards and buttons get the
  outline and shadow from `--border-strong`, `--shadow-card` and `--shadow-button`. Add a 48px
  `size="lg"` to Button. Make focus rings visible on everything (fixes G10).
- **Done when:** the pieces exist and are used nowhere yet, except a small demo section added to
  `/design-lab`. Unit test for `formatPrice()` passes.

### 03 · App shell and navigation · Sonnet
- **Fixes:** G1, G2, G6, G7, G10.
- **What:**
  - **Header:** logo and the user menu.
  - **Phones:** a bottom tab bar (Home, My list, Family), 64px tall.
  - **Wide screens:** the tabs move into the header.
  - **Active tab:** marked with `aria-current`, using `usePathname` in a small client component.
  - **Remove** the dead Search and Notifications buttons.
  - **User menu:** rebuild it on shadcn `DropdownMenu` (Escape and arrow keys work). Keep the
    client-only render: Base UI's trigger causes a hydration mismatch (see `user-menu-client.tsx`).
  - Page padding 16px on phones.
- **Done when:** every signed-in page works at 390px with the new shell; `prefetch={false}` on
  every link; the link-prefetch unit test passes.

### 04 · Loading and error screens · Haiku
- **Fixes:** G3, G4, N1.
- **What:**
  - `loading.tsx` in `(app)`, using shadcn `Skeleton`, shaped like a page header and cards.
  - `error.tsx` in `(app)` and at the root: a friendly message and a "Try again" button.
  - Restyle both `not-found.tsx` with `EmptyState`.
- **Done when:** a slow page shows the skeleton; a thrown error shows the friendly page;
  `/nope` shows the new 404.

### 05a · Someone's list: layout and cards · Sonnet
- **Fixes:** M1, M5, M6, M7.
- **What:** restyle `/members/[userId]` to match the prototype:
  - Header with a large avatar and "Grandma Rose's list", plus how many gifts are up for grabs.
  - "Can't see any of this" banner.
  - One-column cards on phones, two or three columns wider.
  - The store link is a full-size button.
  - The back link always shows: to the family if `familyId` is set, otherwise to Home.
- **Done when:** the page matches the prototype at 390px and 1280px with real data.

### 05b · The claim flow · Sonnet
- **Fixes:** M2, M3, M4.
- **What:** each claim state gets one label and one next step.

  | State | Label | Actions |
  |---|---|---|
  | Up for grabs | Up for grabs | "I'll get this" |
  | Yours, not bought | You're getting this | "I bought it", "Changed my mind" |
  | Yours, bought | You bought this | "Not bought yet? Undo" |
  | Someone else's | Someone's on it / Already bought | none |

  - "Changed my mind" opens an `AlertDialog`.
  - Toasts carry Undo where it makes sense.
  - Uses the existing claim API only.
- **⚠ Surprise test, required:** `tests/e2e/surprise.spec.ts:88` checks that the owner's page shows
  none of the old label texts. Renaming the labels would make it pass even if claims leaked.
  In this PR:
  - Put a `data-claim-state` attribute on the claim chip and claim actions.
  - Change the test to assert that `[data-claim-state]` has a count of 0 on `/gifts`.
  - Keep the old-text check too, updated to the new labels.
  - Update the other claim specs for the new button names and run the full e2e suite.
- **Done when:** claim, buy, undo and release all work against dev; the e2e suite passes; the PR
  description shows the before and after of the surprise test.

### 05c · Gift details and filter · Sonnet
- **Fixes:** L8, M8.
- **What:**
  - Tapping a gift on someone's list opens a shadcn `Sheet` from the bottom: big image, price,
    store button, full notes, the same claim actions.
  - Add the All / Up for grabs / Mine `ToggleGroup` filter above the list.
- **Done when:** the sheet works with the keyboard (focus is trapped, Escape closes it) and at 390px.

### 06 · My list · Sonnet
- **Fixes:** L1–L7.
- **What:** restyle `/gifts`:
  - One "Add a gift" button (drop the duplicate "Paste a link").
  - Responsive cards; notes clamped to two lines.
  - A ⋮ `DropdownMenu` with Edit and Remove; Remove asks in an `AlertDialog` instead of `confirm()`.
  - The "you'll never see who's getting what" line.
  - The new empty state.
- **⚠ Surprise:** still no claim data on this page (`listOwnGifts` doesn't join claims). Don't add
  any.
- **Done when:** `surprise.spec.ts` passes.

### 07 · Add and edit a gift · Sonnet
- **Fixes:** F1–F7.
- **What:** rebuild `gift-form.tsx` with shadcn `Form` for every field:
  - Labels tied to their inputs; every field's error shown inline.
  - Tidy values before validating: add `https://` to links typed without it; strip `$`, commas
    and spaces from prices. Do this in the form, not in `validations.ts`.
  - `inputMode="decimal"` on price.
  - The paste-a-link box gets a real label.
  - "Image URL" moves behind a "Use a different picture" link, filled from the scrape.
  - The edit page matches the add page: back link, same heading, "Save changes" without a +.
  - Cancel goes to `/gifts` instead of `router.back()`.
- **e2e:** keep or update the selectors `gifts.spec.ts` uses ("Add to wishlist", placeholders).
- **Done when:** `amazon.com/x` with price `$25` saves; a missing title shows an inline error.

### 08 · Home · Sonnet
- **Fixes:** D1–D8.
- **What:** restyle `/dashboard` to match the prototype:
  - Greeting hero.
  - "You're shopping for" with progress, plus "Mark bought" through the existing claim API.
  - "Your people" scroller; family card(s); the "surprises stay secret" note.
  - Drop the four stat boxes.
- **Counts:** take member counts from `listMyFamilies().member_count`, and remove people listed
  twice by `user_id` in the page. Note in the PR that the 5-row limit of `fellowMembers` is a
  data-layer follow-up, not touched here.
- **Greeting:** work out morning or evening after mount (client-only), so it uses local time
  (D6).
- **Done when:** counts are right for a user in two families; the page fits at 390px.

### 09 · Families list and family hub · Sonnet
- **Fixes:** FA1–FA3, H1, H3, H4.
- **What:** restyle `/families`, `/families/new` and `/families/[id]`:
  - Avatar stacks, and a list of everyone's lists with gift counts if available (otherwise drop
    the counts).
  - Invite opens a bottom `Sheet` with the copy-link button and the email form.
  - Who sees Invite: see decision 1 below.
- **e2e:** keep "Create family", "Copy invite link" and the "Family name" label, or update
  `families.spec.ts`.
- **Done when:** the family pages pass e2e and fit at 390px.

### 10 · Family settings · Sonnet
- **Fixes:** S1–S4.
- **What:** restyle `/families/[id]/settings`. Add UI for the existing APIs:
  - Rename the family (PATCH).
  - Remove a member (DELETE members), behind an `AlertDialog`.
  - Delete the family (DELETE), owner only, behind an `AlertDialog`.
  - Show owner-only controls only to the owner.
  - No new endpoints. "Leave family" needs an API that doesn't exist yet: list it as a follow-up.
- **Done when:** rename, remove and delete work against dev with confirmations.

### 11 · Account · Haiku
- **Fixes:** A1, A2.
- **What:**
  - Profile card with avatar, name and email.
  - A Sign out button.
  - Change name and password through Better Auth's client (`authClient.updateUser`,
    `authClient.changePassword`), only if those endpoints are enabled in `src/lib/auth/server.ts`.
    If not, leave them out and say so in the PR.
  - Leave a clearly marked spot for the theme picker (task 13).
- **Done when:** sign out works; the page fits at 390px.

### 12 · Sign-in, sign-up and invite pages · Sonnet
- **Fixes:** AU1–AU4, I1–I4.
- **What:**
  - Branded auth layout with logo and cream background.
  - `autocomplete` on every field (`email`, `current-password`, `new-password`, `name`).
  - A show-password toggle; the 8-character rule shown up front.
  - Each error shown once (inline, no toast).
  - Invite and join pages redesigned like the prototype's invite screen, with friendly error
    states that say "ask for a new link".
- **⚠ Anti-enumeration:** sign-up and forgot-password must still answer the same for every email.
  Keep the "Check your email" headings that `auth.spec.ts` checks.
- **Done when:** `auth.spec.ts` and `families.spec.ts` pass.

### 13 · Confetti theme and the picker · Sonnet
- **What:** add Confetti under `[data-theme="confetti"]` in `globals.css`: tokens, gradients in
  `--hero`, pill radius, its button shadow, Fredoka and Nunito.
- **Switcher:** wrap the app in `next-themes`' `ThemeProvider`:
  - `attribute="data-theme"`, `themes={["picnic", "confetti"]}`, `defaultTheme="picnic"`.
  - `enableSystem={false}` (dark mode isn't set up).
- **Picker:** on Account, two large preview cards that switch the theme live.
- **⚠ Toasts:** `src/components/ui/sonner.tsx` passes `useTheme()`'s value to Sonner as light or
  dark. Pass a fixed `"light"` instead, or Sonner gets "picnic".
- **Note:** the choice is saved per device (localStorage). Saving it to the account needs a
  database column: a separate backend PR, if wanted.
- **Done when:**
  - A new visitor gets Picnic.
  - Choosing Confetti survives a reload with no flash of Picnic.
  - Fonts: only the active theme's display font preloads.

### 14 · Confetti check · Sonnet
- **What:** screenshot every screen in both themes at 390px and 1280px, fix anything that looks
  wrong in Confetti, and check contrast in both themes.
- **Fix rule:** fixes go in tokens; any per-component fix needs a reason in the PR.
- **Done when:** both themes pass a contrast check (WCAG AA).

### 15 · Copy and naming · Haiku
- **Fixes:** G8, G13.
- **What:**
  - One name throughout: "Lumen" for the app, "my list" and "Rose's list" for lists.
  - Page `<title>`s via metadata.
  - Find and fix the missing-space bug everywhere (`members/[userId]/page.tsx:125` is known).
- **Done when:** a search for "Lumen List" and "wishlist" in UI text comes up empty, except where
  intended.

### 16 · Cleanup · Haiku
- **What:** delete the `ds-*` and `t-*` classes from `globals.css`, and the custom icon set in
  `brand.tsx` (use lucide). Remove leftover inline `style={{…}}` objects, and delete
  `src/app/design-lab/` and the `design-lab` notes in `CODEBASE.md`.
- **Done when:** a search for `ds-btn`, `ds-card` and `style={{` in `src/app` and `src/components`
  finds nothing; build passes.

### Then: release
Cut `release/x.y` from `develop`. Check it on staging at 390px with real family accounts, then
merge into `main`.

---

## Decisions (2026-10-10)

1. **Everyone in a family can invite** (H2). Task 09 shows Invite to every member.
2. **Name and password changes are in scope** for task 11, if Better Auth's endpoints are on.
3. **Dev seed data: yes**, as its own PR (task S below).

### S · Dev seed script · Sonnet (parallel with 01)
- **What:** `scripts/seed-dev.ts` (`pnpm db:seed:dev`) creates a demo family on the **dev** Neon
  branch only: a few verified users with known passwords, gifts with images and notes, and claims
  in every state. Reuse the e2e backend seam and its guard (`tests/e2e/support/`) so it refuses
  the production branch and prod hostnames. It can run again safely (upsert or wipe its own demo
  users only).
- **Done when:** running it twice against dev leaves one demo family; signing in as a demo user
  shows lists in every claim state; it refuses a prod URL (unit-tested guard).
