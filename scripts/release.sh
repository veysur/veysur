#!/usr/bin/env bash
set -euo pipefail

# Cuts a release from pending changesets. veysur-app/api/common/theme/docsite
# are a `fixed` changeset group, so they always bump to the same version
# together; this also syncs the root package.json version to match and tags
# the whole repo vX.Y.Z (not per-package tags, unlike mzen/s3-adaptor).
#
# Mechanical steps only: version bump, commit, tag, push. GitHub release
# creation is left as a manual step (printed at the end) since changelog
# entries don't extract cleanly enough to automate reliably.

cd "$(dirname "$0")/.."

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree not clean. Commit or stash changes first." >&2
  exit 1
fi

if ! ls .changeset/*.md >/dev/null 2>&1; then
  echo "No pending changesets in .changeset/ — nothing to release." >&2
  exit 1
fi

pnpm changeset version

if git diff --quiet -- package/app/package.json; then
  echo "changeset version produced no version bump." >&2
  exit 1
fi

VERSION=$(node -p "require('./package/app/package.json').version")

# Root package.json isn't part of the changeset fixed group (private, not a
# real workspace package) — keep it in sync by hand.
node -e "
  const fs = require('fs')
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  pkg.version = '$VERSION'
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
"

git add -A
git commit -m "chore(release): v${VERSION}"
git push

TAG="v${VERSION}"
git tag "$TAG"
git push --tags

echo
echo "Tagged and pushed: $TAG"
echo
echo "Next: cut a GitHub release from the root CHANGELOG.md entry, e.g.:"
echo "  gh release create '$TAG' --title '$TAG' --notes-file <(sed -n '/^## ${VERSION}\$/,/^## /p' CHANGELOG.md | sed '\$d')"
