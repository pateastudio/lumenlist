#!/usr/bin/env bash
# Proves the Lambda bundle works before anything deploys it. CI runs this on every PR.
#
#   scripts/check-bundle.sh                 # build the bundle, then test it
#   scripts/check-bundle.sh --skip-build    # test the .open-next already built
#
# Zips the bundle exactly as deploy.sh does, unzips it into a fresh folder, and calls the handler
# from there. Importing it where it was built passes even when the deployed one is broken, because
# the build folder's symlinks still resolve.
set -euo pipefail
cd "$(dirname "$0")/.."
# shellcheck source=scripts/lib/zip-bundle.sh
source scripts/lib/zip-bundle.sh

skip_build=0
case "${1:-}" in "") ;; --skip-build) skip_build=1 ;; *) echo "unknown option: $1" >&2; exit 2 ;; esac

bundle=.open-next/server-functions/default
if [ "$skip_build" = 0 ]; then
  echo "==> build"
  pnpm run build:aws
fi
[ -d "$bundle" ] || { echo "Missing $bundle. Run without --skip-build." >&2; exit 1; }

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

echo "==> zip, unzip elsewhere"
zip_bundle "$bundle" "$work/server.zip"
size="$(wc -c <"$work/server.zip" | tr -d ' ')"
echo "     zip is $((size / 1024 / 1024)) MB"
# deploy.sh uploads the zip directly, and Lambda accepts at most 50 MB that way.
[ "$size" -lt $((50 * 1024 * 1024)) ] || { echo "FAIL: the zip is over the 50 MB direct upload limit." >&2; exit 1; }
mkdir "$work/unzipped"
unzip -q "$work/server.zip" -d "$work/unzipped"

echo "==> call the handler"
node scripts/lib/invoke-bundle.mjs "$work/unzipped"
