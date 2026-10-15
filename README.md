# Lumen List — Family Gift Registry

A web app for families to share wishlists and coordinate gift purchases without spoiling surprises. Family members can see what others want and mark items as claimed or purchased — but the person who added the gift never sees who's buying what for them.

LumenList is live at https://lumenlist.app.

## Demo

A two-minute walkthrough: adding a gift from a link, claiming one from someone else's list, and what the owner sees afterwards.

https://github.com/user-attachments/assets/3c2d1f96-4db9-44d9-9f2d-37412ceec536

## Features

- Email/password authentication
- Create family groups; invite members by email or shareable link
- Add gifts to your wishlist (title, description, price, URL, image)
- View family members' wishlists and claim gifts
- Surprise preservation: gift owners can't see claim status on their own gifts — enforced at the database level via RLS

## Tech stack

- **Next.js 16** (App Router, TypeScript), built for AWS Lambda with OpenNext
- **Neon Postgres** (Row Level Security, three roles) through **Drizzle**, and self-hosted **Better Auth**. Prod moved from Supabase on 2026-10-09 (issue #50)
- **Resend** for every user-facing email
- **TailwindCSS + shadcn/ui**
- **AWS** (Lambda, CloudFront, S3) and **Cloudflare** DNS, managed with Terraform (`infra/`, kept out of the public mirror)

## Local setup

Node 24 and pnpm (the version in `package.json`'s `packageManager` field). npm and yarn lockfiles are refused by CI.

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Create `.env.local` pointing at a Neon **dev** branch (never production):
   ```
   DATABASE_URL=            # app_user, pooled
   AUTH_DATABASE_URL=       # auth_service, pooled
   BETTER_AUTH_SECRET=      # any 32+ random characters, locally
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   APP_ENV="dev"
   NON_PROD_MAIL_TO="you@example.com"
   RESEND_API_KEY=
   RESEND_FROM_EMAIL="Lumenlist <hello@join.lumenlist.app>"
   E2E_DATABASE_URL=        # neondb_owner, unpooled, for the e2e suite
   E2E_APP_DATABASE_URL=    # same as DATABASE_URL
   ```

3. Run the dev server:
   ```bash
   pnpm dev
   ```

## Tests

```bash
pnpm test            # unit tests (Vitest)
pnpm test:db         # RLS and data contract tests against Postgres 18 in Docker (start Docker first)
pnpm test:e2e        # end-to-end (Playwright) against a local production build and the Neon dev branch
E2E_BASE_URL=https://staging.lumenlist.app pnpm test:e2e   # against a deployed environment
```

The e2e suite creates and deletes its own users (`delivered+e2e-...@resend.dev`) and refuses to run against production.


## Codebase documentation

See [`CODEBASE.md`](./CODEBASE.md) for a living description of the project structure, design decisions, and current state. This file is updated whenever changes are made to the app.

## License

Copyright (C) 2026 Patea LLC

LumenList is free software: you can redistribute it and modify it under the terms of the GNU Affero General Public License, version 3 only, as published by the Free Software Foundation. It comes with no warranty. If you run a modified version as a service, the license requires you to offer its source code to the people who use it. The full text is in [`LICENSE`](./LICENSE).

## About this repository

LumenList is live at https://lumenlist.app. This repository is a public mirror: each release is published here as one commit, tagged with the release's version. Development, issues and deployment happen in a private repository, and the deployment configuration (infrastructure, workflows that deploy, and environment settings) is kept private, so it is not here.

What is here builds and tests on its own: `pnpm install`, `pnpm lint`, `pnpm run typecheck`, `pnpm test`, and `scripts/test-db.sh` with Docker running. The CI in `.github/workflows/ci.yml` runs the same checks.

The e2e suite and the seeds refuse a production database. Before pointing them at Neon, set `PROD_NEON_ENDPOINT` to your production branch's endpoint id (the first part of its hostname); while it is unset they refuse every Neon database.

LumenList is licensed under the GNU Affero General Public License, version 3 only (AGPL-3.0). See [`LICENSE`](./LICENSE).

To report a security problem, see [`SECURITY.md`](./SECURITY.md). LumenList does not accept outside contributions for now; [`CONTRIBUTING.md`](./CONTRIBUTING.md) says why.
