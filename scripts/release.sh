#!/usr/bin/env bash
set -euo pipefail

# Cuts a release from pending changesets. veysur-app/api/common/theme/docsite
# are a `fixed` changeset group, so they always bump to the same version
# together; this also syncs the root package.json version to match and tags
# the whole repo vX.Y.Z (not per-package tags, unlike datacapy/s3-adaptor).
#
# Steps: version bump, root changelog entry, commit, tag, push, then a GitHub
# release whose notes are that changelog entry. Publishing the operator package
# (images and tarballs) stays manual; the commands are printed at the end.

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

# Changesets writes only the per-package changelogs; build the root entry (the canonical
# release history, and the source of the GitHub release notes below) from them.
node scripts/release-changelog.mjs "$VERSION"

git add -A
git commit -m "chore(release): v${VERSION}"
git push

TAG="v${VERSION}"
git tag "$TAG"
git push --tags

echo
echo "Tagged and pushed: $TAG"

# The release's notes are this version's root changelog entry, minus its heading.
NOTES=$(mktemp)
trap 'rm -f "$NOTES"' EXIT
awk -v heading="## ${VERSION}" '
  $0 == heading { found = 1; next }
  found && /^## / { exit }
  found { print }
' CHANGELOG.md >"$NOTES"

if command -v gh >/dev/null 2>&1; then
  gh release create "$TAG" --title "$TAG" --notes-file "$NOTES"
else
  echo "gh not found: create the release yourself from the CHANGELOG.md entry for ${VERSION}." >&2
fi

echo
echo "Next, publish the operator package (requires 'docker login ghcr.io' once):"
echo "  deploy/scripts/release-package.sh $VERSION --push"
echo "  gh release upload '$TAG' deploy/dist/veysur-$VERSION.tar.gz"
echo "Optionally add the air-gapped bundle too:"
echo "  deploy/scripts/release-package.sh $VERSION --images"
echo "  gh release upload '$TAG' deploy/dist/veysur-$VERSION-with-images.tar.gz"
