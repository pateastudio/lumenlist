<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Agent instructions

## Before writing any code

Read [`CODEBASE.md`](./CODEBASE.md). It describes the current project structure, design decisions, and known patterns. Do not assume anything about the codebase that isn't confirmed by reading the actual files.

## After making changes

Update `CODEBASE.md` to reflect what changed. Keep it accurate and current — it's the single source of truth for future agents. If you add a route, component, or table, document it. If you change a design decision, update the relevant section.

## Key conventions

- **Server vs client components**: default to Server Components. Use `"use client"` only when you need browser events, state, or effects.
- **Data access**: pages and API routes get the user from `getCurrentUser()` (pages) or `requireUser()` (routes) in `src/lib/auth/user.ts`, and their data from `src/lib/data/*` inside `withUser(user.id, (tx) => ...)` (`withAnonymous` for signed-out pages). Never import the pools (`@/lib/db`), Drizzle or `pg` outside `src/lib`; `tests/unit/data-access.test.ts` enforces it.
- **Schema changes**: edit `src/db/schema.ts`, then `pnpm db:generate` (or `pnpm db:generate --custom --name <x>` for SQL like policies and functions). Destructive statements need a `-- contract:` marker and a reviewed raise of `drizzle/ceiling.json`. Types come from the schema (`src/types/index.ts`); nothing is hand-generated.
- **Database tests**: `scripts/test-db.sh` (Docker) runs the RLS and data contract tests against the real migrations. Add a case there for any new policy or definer function.
- **Surprise preservation**: the `gift_claims_select` RLS policy is the core security guarantee: gift owners cannot see claims on their own gifts. Never weaken it, never give the app a connection that bypasses RLS, and never read claims for the owner's own list (`listOwnGifts` doesn't join them). The database enforces it as the last line of defense.
- **Forms**: use `react-hook-form` + `zod` with schemas defined in `src/lib/validations.ts`.
- **Toasts**: use `sonner` via `import { toast } from "sonner"`.
- **Signed-in pages:** every `<Link>` sets `prefetch={false}`, and pages get the user with `getCurrentUser()` (`src/lib/auth/user.ts`). Tests enforce both; `CODEBASE.md` says why.

