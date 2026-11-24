#!/usr/bin/env bash
set -euo pipefail

# Fails when a submodule library (datacapy, s3-adaptor) has unreleased changes that veysur
# would ship against an unreleased library version. Called by release.sh before it does
# anything else. Checks, per submodule:
#   1. pending changesets at the commit veysur pins        -> release the library first
#   2. pending changesets on the library's origin/master   -> pull them, release, then bump
# A pinned commit that is merely behind origin/master (for example dependency bumps with no
# changeset) is reported but does not block.
# Usage: scripts/release-check-submodules.sh        (run from anywhere; resolves the repo root)

cd "$(dirname "$0")/.."

SUBMODULES=(external/datacapy external/s3-adaptor)
FAILED=false

# Changeset files (not the README) in a submodule's .changeset/ at a given commit.
pending_changesets() {
  local dir=$1 ref=$2
  git -C "$dir" ls-tree --name-only "$ref" .changeset/ 2>/dev/null \
    | grep -E '\.md$' | grep -v -E '(^|/)README\.md$' || true
}

for dir in "${SUBMODULES[@]}"; do
  name=$(basename "$dir")

  if [[ ! -e "$dir/.git" ]]; then
    echo "$dir is not checked out. Run: git submodule update --init $dir" >&2
    exit 1
  fi

  pinned=$(git ls-tree HEAD "$dir" | awk '{print $3}')
  git -C "$dir" fetch -q origin master

  at_pin=$(pending_changesets "$dir" "$pinned")
  at_origin=$(pending_changesets "$dir" origin/master)

  if [[ -n "$at_pin" ]]; then
    FAILED=true
    {
      echo
      echo "$name has unreleased changes at the commit veysur pins:"
      echo "$at_pin" | sed 's/^/  /'
      echo "Release it first, then bump the pointer:"
      echo "  cd $dir && git switch master && git pull"
      echo "  ./scripts/release.sh"
      echo "  ./scripts/publish.sh --dry-run && ./scripts/publish.sh"
      echo "  cd - && git add $dir && pnpm install && git add pnpm-lock.yaml"
      echo "  git commit -m 'chore(external): update $name' && git push"
    } >&2
  elif [[ -n "$at_origin" ]]; then
    FAILED=true
    {
      echo
      echo "$name has unreleased changes on origin/master that veysur does not pin yet:"
      echo "$at_origin" | sed 's/^/  /'
      echo "Release them, then bump the pointer (same steps as above, starting with git pull in $dir)."
    } >&2
  elif [[ "$(git -C "$dir" rev-parse origin/master)" != "$pinned" ]]; then
    echo "Note: $name is pinned behind origin/master, with no unreleased changesets. Not blocking."
  fi
done

if $FAILED; then
  echo >&2
  echo "Release blocked: submodule libraries must be released and bumped in veysur first." >&2
  exit 1
fi

echo "Submodule libraries are released and pinned."
