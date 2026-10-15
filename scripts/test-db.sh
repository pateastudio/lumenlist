#!/usr/bin/env bash
# Runs the database contract tests against Postgres 18 in Docker, with the real migrations.
#
#   scripts/test-db.sh
#
# Locally, start Docker Desktop first. CI's runner has Docker.
set -euo pipefail
cd "$(dirname "$0")/.."
name=lumenlist-test-db
# The official image, from whichever registry lets us have it. Both rate-limit anonymous pulls from
# shared CI runners ("toomanyrequests"): Docker Hub blocked every deploy on 2026-10-09, and AWS's
# public mirror refused the database tests on 2026-10-14. Try AWS first, then Docker Hub.
image=""
for candidate in public.ecr.aws/docker/library/postgres:18 docker.io/library/postgres:18; do
  if docker image inspect "$candidate" >/dev/null 2>&1 || docker pull -q "$candidate" >/dev/null; then
    image="$candidate"
    break
  fi
  echo "could not pull $candidate, trying the next registry" >&2
done
[ -n "$image" ] || { echo "no registry would give us postgres:18" >&2; exit 1; }
docker rm -f "$name" >/dev/null 2>&1 || true
# Let Docker choose a free host port: a fixed one inside the ephemeral range (32768-60999) can
# already be taken by an outbound connection on a CI runner.
docker run -d --name "$name" -e POSTGRES_PASSWORD=test -p 127.0.0.1::5432 "$image" >/dev/null
port="$(docker port "$name" 5432/tcp | head -1 | sed 's/.*://')"
trap 'docker rm -f "$name" >/dev/null 2>&1 || true' EXIT
# Check over TCP: the image's first-boot init runs a temporary server on the Unix socket only,
# then restarts, so a socket check can pass just before that restart.
for _ in $(seq 60); do docker exec "$name" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1 && break; sleep 1; done

# Neon's owner is not a superuser; make the same shape: neondb_owner owns the database.
docker exec "$name" psql -h 127.0.0.1 -U postgres -c "create role neondb_owner login password 'test' createrole" >/dev/null
docker exec "$name" psql -h 127.0.0.1 -U postgres -c "create database neondb owner neondb_owner" >/dev/null
export DATABASE_URL_UNPOOLED="postgres://neondb_owner:test@localhost:$port/neondb"
pnpm exec drizzle-kit migrate
docker exec "$name" psql -h 127.0.0.1 -U postgres -d neondb -c "alter role app_user login password 'test'; alter role auth_service login password 'test'" >/dev/null

export TEST_OWNER_URL="$DATABASE_URL_UNPOOLED"
export TEST_APP_URL="postgres://app_user:test@localhost:$port/neondb"
export TEST_AUTH_URL="postgres://auth_service:test@localhost:$port/neondb"
# The app's own modules (src/lib/db) read these.
export DATABASE_URL="$TEST_APP_URL" AUTH_DATABASE_URL="$TEST_AUTH_URL"
pnpm exec vitest run --config vitest.db.config.ts
