# UI overhaul: discovery (issue #54)

Inventory, UX audit and design directions for the shadcn/ui overhaul. Written before the work
started: the app has since been restyled (see `plan.md`) and the prototypes at `/design-lab` have
been removed (git history, PR #92).

Severity:

- **S1 broken**: unusable at 390px, wrong data on screen, or a silent failure
- **S2 high**: confusing, or gets in the way of a common task
- **S3 medium**: inconsistency, accessibility gap, awkward but workable
- **S4 low**: polish

Findings come from reading the code, not from a signed-in session. Layout claims follow from fixed
grid templates (for example `repeat(3, 1fr)` with no breakpoint) and the 28px page gutters.

---

## 1. Inventory

| Route | What it is | Components on it | Styling today |
|---|---|---|---|
| `(app)/layout` | Shell for signed-in pages | `Nav` (brand, 3 links, search, bell, `UserMenu`) | inline styles + `ds-*` |
| `/dashboard` | Home | hero + `DashboardGreeting` + `GiftTagMotif`, 4 stat cards, families list, members list, "You're getting" list | inline styles + `ds-*` |
| `/gifts` | My list (owner view, never shows claims) | header, `GiftCard` (vertical) with `DeleteGiftButton`, empty state with 3 tips | inline + `ds-*` |
| `/gifts/new` | Add a gift | back link, `GiftForm` (paste-a-link auto-fill + manual fields) | inline + `ds-*` |
| `/gifts/[id]/edit` | Edit a gift | `GiftForm` | Tailwind heading + `ds-*` form |
| `/members/[userId]` | Someone else's list, claim flow | header with avatar, "can't see who claimed" banner, `GiftCard` (horizontal) with `ClaimButton` | inline + `ds-*` |
| `/families` | My families | family cards | raw Tailwind (`text-gray-600`) + `ds-*` |
| `/families/new` | Create family | `CreateFamilyForm` | shadcn `Form`, `Input`, `Button` |
| `/families/[id]` | Family hub | header card, `CopyInviteLink`, member cards | inline + `ds-*` |
| `/families/[id]/settings` | Invite, share link, member list | `InviteMemberForm`, `CopyInviteLink`, shadcn `Card`, `Separator` | shadcn + Tailwind |
| `/account` | Profile (read-only) | shadcn `Card` | shadcn + Tailwind |
| `/login`, `/signup`, `/forgot-password`, `/reset-password` | Auth | `LoginForm`, `SignupForm`, `ForgotPasswordForm`, `ResetPasswordForm` | shadcn forms on `bg-gray-50` |
| `/invite/[token]`, `/join/[code]` | Landing pages for invitees (signed out allowed) | `AcceptInviteButton`, `JoinFamilyButton` | raw Tailwind, black buttons |
| `not-found` (root and `(app)`) | 404 | links | Tailwind + `ds-*` |

There is no gift detail screen, no `loading.tsx` and no `error.tsx` anywhere. There is no seed or
demo data in the repo; the removed prototypes used an invented fixture family.

**shadcn today:** `components.json` is set up (`base-nova`, Base UI primitives), and `avatar`,
`badge`, `card`, `dialog`, `dropdown-menu`, `input`, `label`, `separator`, `sonner` were installed,
but most screens don't use them. `button.tsx` and `form.tsx` are hand-replaced Radix versions (for
`asChild`). Most UI is a parallel hand-made system: `ds-btn`, `ds-card`, `ds-badge`, `t-h1` and
friends in `globals.css`, plus inline `style={{…}}` objects.

---

## 2. UX issues by screen

### Everywhere (shell, nav, system)

| # | Sev | Issue |
|---|---|---|
| G1 | S1 | **The nav doesn't adapt to phones.** Brand, three labelled links, search, bell and avatar share one 64px row with 28px gutters, wider than a 390px screen. (`shared/nav.tsx`) |
| G2 | S2 | **Search and Notifications buttons do nothing.** No handlers; dead affordances in the most visible spot. |
| G3 | S2 | **No loading feedback.** No `loading.tsx`; a click on Lambda can take 1 to 3 seconds with nothing on screen, so people tap again. |
| G4 | S2 | **No friendly error pages.** No `error.tsx`, so failures show Next's generic "This page couldn't load" (see the old manual test notes, `tests/test-issues.md`, since removed). |
| G5 | S3 | **Three styling systems at once**: `ds-*` classes with inline styles, shadcn components, and raw Tailwind greys. Page titles alone come in three styles (`t-display-sm`, `t-h1`, `text-2xl font-bold`). |
| G6 | S3 | Nav links have no active state; you can't tell which section you're in. |
| G7 | S3 | The user menu is hand-rolled: no Escape to close, no arrow keys despite `role="menu"`, 30px target, and it renders client-only so the avatar pops in after load. |
| G8 | S3 | Naming wanders: "Lumen", "Lumen List", "My Lumen List", "wishlist" and "list" for the same things; the tab title is "Lumen — Lumen List for Families". |
| G9 | S3 | Text is small for older relatives (11 to 13.5px for meta, badges and help), and the `--ink-4` grey used for "(optional)" and placeholders is below WCAG AA contrast. |
| G10 | S3 | Inline-styled links (nav, back links, "Create family →") have no visible keyboard focus. |
| G11 | S4 | `avatar_url` is never shown; avatars are always initials. |
| G12 | S4 | The Button `destructive` variant uses `--destructive-foreground`, which `globals.css` never defines. |
| G13 | S3 | **Turbopack drops a space in some JSX text.** Text that starts with a space right after a tag or `{expression}`, contains an entity such as `&apos;`, and runs to a line break loses its leading space (seen in the compiled design-lab chunk: `</strong> Pick something, and we&apos;ll…` became `"Pick something…"`). Known hit: `members/[userId]/page.tsx:125` likely renders "Grandma Rosehasn't added any gifts yet." Write `{" "}` explicitly; consider a lint rule or reporting it upstream. |

### Dashboard (`/dashboard`)

| # | Sev | Issue |
|---|---|---|
| D1 | S1 | Stats strip is a fixed 4-column grid: about 75px per card at 390px, so labels, icons and numbers collide. |
| D2 | S1 | The body is a fixed `1.6fr 1fr` two-column grid: "You're getting" is about 120px wide on a phone. |
| D3 | S2 | The hero's gift-tag illustration is pinned top-right and sits over the 44px greeting on narrow screens. |
| D4 | S2 | **Member counts are wrong.** They come from `fellowMembers(tx, id, 5)`, a 5-row sample across all families: the "Members" stat tops out at 6, per-family counts undercount or vanish, and someone in two of your families is listed twice (duplicate React key). The UI can use `member_count`, which `listMyFamilies` already returns. |
| D5 | S3 | Copy edge cases: "across 0 families", "I'm getting 0 · all purchased", and a calendar icon for Members. |
| D6 | S3 | The greeting likely shows the server's (UTC) time of day: `suppressHydrationWarning` keeps the server's text instead of re-rendering it, so a US evening can read "Good morning". The date eyebrow is server time too. Needs a check in a browser. |
| D7 | S3 | "Browse family wishlists" opens only the first family. |
| D8 | S4 | "Family members" stops at 5 with no "see all". |

### My list (`/gifts`)

| # | Sev | Issue |
|---|---|---|
| L1 | S1 | Fixed 3-column grid: cards about 100px wide on a phone, titles wrap a word per line. |
| L2 | S2 | The title and two non-shrinking buttons share a row and overflow at 390px. |
| L3 | S2 | "Paste a link" and "Add gift" both open `/gifts/new`: two buttons, one action. |
| L4 | S2 | Edit and Remove are 12.5px text links next to each other: hard to tap, easy to hit the wrong one. |
| L5 | S2 | Remove uses the browser's `confirm()` dialog. |
| L6 | S3 | The empty state's three tips are a fixed 3-column grid. |
| L7 | S3 | Long notes aren't clamped, so cards in a row have very different heights. |
| L8 | S3 | There's no way to see a gift's full details; the card is the only view. |
| L9 | S4 | Prices print raw (`$1250`, `$49.9`) with no currency formatting. |

### Add and edit gift (`/gifts/new`, `/gifts/[id]/edit`)

| # | Sev | Issue |
|---|---|---|
| F1 | S1 | **Saving silently fails.** Only the Title error is rendered. A link typed as `amazon.com/…`, an image link without `http`, or a price like `$25` fails validation and the button just does nothing. (`gift-form.tsx`, `giftSchema`) |
| F2 | S2 | Labels aren't tied to inputs (no `htmlFor`/`id`), so tapping a label doesn't focus the field and screen readers hear unlabelled fields. The paste-a-link box has no label at all. |
| F3 | S2 | "Image URL" asks non-technical people for a raw image address. Most will leave it empty or paste the product link. |
| F4 | S3 | Link and Price share a fixed `1fr 160px` row: cramped on phones. |
| F5 | S3 | Edit looks different from Add (no back link, other heading, narrower), and its Save button still has a "+" icon. |
| F6 | S3 | Cancel is `router.back()`; opened from a shared link, it leaves the app. |
| F7 | S4 | Price has no `inputMode="decimal"`, so phones show the full keyboard. |

### Someone's list and claiming (`/members/[userId]`)

| # | Sev | Issue |
|---|---|---|
| M1 | S1 | Fixed 2-column grid of horizontal cards: about 165px per card at 390px, with a 100px image column, leaving about 60px for title, price, badge and buttons. |
| M2 | S2 | "Someone else has it" is said three times: a Claimed badge, "Reserved by someone" and a disabled "Someone's got it" button. |
| M3 | S2 | After you claim, the card never says "You're getting this"; only the border changes. "Mark purchased" and "Unclaim" sit side by side, and Unclaim has no confirmation. |
| M4 | S2 | Purchased shows a lone "Undo" button (undo what?), and purchased-by-you looks the same as purchased-by-someone-else. |
| M5 | S2 | The where-to-buy link is a 12.5px grey domain name, though it's what a buyer needs most. |
| M6 | S3 | The back link appears only with `?familyId=`; otherwise the nav is the only way back. |
| M7 | S3 | Claim buttons are 32px tall, under the 44px touch guideline. |
| M8 | S4 | No filter for "still available" and no sort by price. |

### Families (`/families`, `/families/new`)

| # | Sev | Issue |
|---|---|---|
| FA1 | S3 | Styled with raw Tailwind (`text-2xl`, `text-gray-600`), unlike the rest; reads as a different app. |
| FA2 | S3 | A family card is just a name and a count; no faces, no way to jump to a person. |
| FA3 | S4 | Create family is one field on an otherwise empty page with no hint of what happens next (inviting). |

### Family hub (`/families/[id]`)

| # | Sev | Issue |
|---|---|---|
| H1 | S1 | Members grid is fixed at 3 columns: about 100px cards at 390px, and "View Grandma's list →" overflows. |
| H2 | S2 | Only the owner sees "Copy invite link", though the database lets any member invite (`create_invite` checks membership only). Members have no way to bring someone in. |
| H3 | S3 | "Family · Created 2026" header badge is noise; the hub has no family-wide view of gifts. |
| H4 | S3 | Long names aren't truncated in member cards. |

### Family settings (`/families/[id]/settings`)

| # | Sev | Issue |
|---|---|---|
| S1 | S2 | The API can rename and delete a family and remove a member, but there's no UI for any of it, and no "leave family" anywhere. |
| S2 | S2 | The page doesn't check ownership, yet the hub hides the Settings link from non-owners: members can reach it by URL and invite, but are told elsewhere they can't. |
| S3 | S3 | The invite form's error pushes the input down and misaligns the button; on phones the button is squeezed. Pending invites aren't listed. |
| S4 | S3 | Styled as shadcn cards with `text-2xl`, unlike the hub one click away. |

### Account (`/account`)

| # | Sev | Issue |
|---|---|---|
| A1 | S2 | Read-only: you can't change your name or password, and sign-out lives only in the avatar menu. |
| A2 | S3 | Off-system styling, a lot of empty page for two lines of text. |

### Sign in, sign up, password reset

| # | Sev | Issue |
|---|---|---|
| AU1 | S2 | No brand: grey background and a plain "Sign in". This is the first thing an invited relative sees. |
| AU2 | S2 | No `autocomplete` attributes (`email`, `current-password`, `new-password`, `name`), so password managers and iOS autofill don't help. |
| AU3 | S3 | Every error is shown twice, as a toast and inline. |
| AU4 | S3 | No show-password toggle; the 8-character rule shows only after a failed attempt. |

### Invite and join landing pages (`/invite/[token]`, `/join/[code]`)

| # | Sev | Issue |
|---|---|---|
| I1 | S2 | Off-brand: black buttons, no logo, no layout, and these are a new family member's first screen. |
| I2 | S3 | Error states offer only "Go to login" and don't say what to do (ask for a new link). |
| I3 | S3 | Technical wording: "This invite code format is invalid." |
| I4 | S4 | A signed-in visitor isn't told which account will join. |

### 404

| # | Sev | Issue |
|---|---|---|
| N1 | S4 | Off-system styling; otherwise fine. |

### Priorities at a glance

1. **Phones (S1):** G1, D1, D2, L1, M1, H1. One responsive shell and responsive grids fix most of them.
2. **Silent failures and wrong numbers (S1, S2):** F1, D4.
3. **The claim flow (S2):** M2 to M5. This is the app's core moment and it's the most confusing.
4. **First impressions (S2):** AU1, I1, I2; the invitee's path is login → invite → list.
5. **Dead or missing affordances (S2):** G2, L3, S1, A1, G3, G4.

---

## 3. Notes outside UI scope (not touched)

- **`fellowMembers` limits rows, not people** (`src/lib/data/families.ts`). The dashboard can stop
  depending on it for counts (D4), but a "people in my families" list wants a query that returns
  distinct people.
- **Who may invite is undecided in the product.** `create_invite()` allows any member; the hub
  shows the link to owners only (H2, S2). Pick one and make the UI follow.
- **New dependency:** `shadcn add` (CLI 4.21) now imports `cn` from shadcn's own `cn` package
  rather than `@/lib/utils`, and added it to `package.json`. Published by the shadcn maintainer.
  Either keep it (CLI output stays untouched) or point `components.json` at `@/lib/utils` before the
  real rollout; mixing both is harmless but untidy.
- `tests/test-issues.md` is from the Vercel era (since removed); its 404 and join-link findings should be re-tested
  on AWS.

---

## 4. Design directions

Shown at `/design-lab` (since removed; see git history, PR #92). Each direction renders the same fixture family through
the same shadcn primitives, with its own tokens, type and a few layout choices. The
palettes and the "who it delights" notes.
