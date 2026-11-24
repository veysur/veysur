#!/usr/bin/env bash
set -euo pipefail

# Warns when feat/fix commits since the last release tag carry no changeset, so they would be
# missing from the changelog and release notes. A heuristic: a commit counts as covered when
# it adds or edits a .changeset/*.md file itself. A changeset added in a separate commit is
# not recognised, so a warning is a prompt to check, not proof of a gap.
# Asks to continue on a terminal; otherwise it only prints the warning.
# Usage: scripts/release-check-changesets.sh [base-ref]   (default: the latest v* tag)

cd "$(dirname "$0")/.."

BASE=${1:-$(git describe --tags --abbrev=0 --match 'v*' 2>/dev/null || true)}
[[ -n "$BASE" ]] || { echo "No release tag found, skipping the changeset coverage check."; exit 0; }

# feat/fix in a package scope; release, deps, tooling, docs and refactors never need an entry.
PATTERN='^(feat|fix)\((app|api|common|theme|docsite)\)!?: '

UNCOVERED=()
while read -r hash subject; do
  [[ "$subject" =~ $PATTERN ]] || continue
  if git show --name-only --format= "$hash" | grep -E '^\.changeset/.*\.md$' | grep -qv 'README\.md'; then
    continue
  fi
  UNCOVERED+=("$hash $subject")
done < <(git log "$BASE"..HEAD --no-merges --format='%h %s')

if [[ ${#UNCOVERED[@]} -eq 0 ]]; then
  echo "Every feat/fix commit since $BASE carries a changeset."
  exit 0
fi

echo >&2
echo "These feat/fix commits since $BASE add no changeset, so they may be missing from the changelog:" >&2
printf '  %s\n' "${UNCOVERED[@]}" >&2
echo >&2
echo "Pending changesets:" >&2
for f in .changeset/*.md; do
  [[ "$f" == .changeset/README.md ]] || echo "  $f" >&2
done
echo "If they are not covered, add one with 'pnpm changeset', commit and push, then re-run." >&2

if [[ -t 0 ]]; then
  read -r -p "Continue the release anyway? [y/N] " answer
  [[ "$answer" =~ ^[Yy]$ ]] || { echo "Release stopped." >&2; exit 1; }
fi
