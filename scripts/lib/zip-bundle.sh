# shellcheck shell=bash
# Zips the OpenNext server bundle exactly as it is deployed. Sourced by deploy.sh and
# check-bundle.sh so the test and the deploy can never zip differently.
#
#   zip_bundle <bundle-dir> <zip-file>
#
# `zip -r` follows directory symlinks and turns them into plain copies, which is why
# pnpm-workspace.yaml sets nodeLinker: hoisted.
zip_bundle() {
  local bundle="$1" zip_file="$2"
  (cd "$bundle" && zip -qrX "$zip_file" .)
}
