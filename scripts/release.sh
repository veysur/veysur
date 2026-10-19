#!/usr/bin/env bash
set -euo pipefail
# cspell:ignore Zenodo

# Cuts a release from pending changesets. veysur-app/api/common/theme/docsite
# are a `fixed` changeset group, so they always bump to the same version
# together; this also syncs the root package.json version to match and tags
# the whole repo vX.Y.Z (not per-package tags, unlike datacapy/s3-adaptor).
#
# Steps:
#   1. Pre-flight: clean tree, on master and in sync, gh signed in, lockfile current.
#   2. Run .github/workflows/release-check.yml (image build, nothing pushed) and wait for it.
#   3. Version bump, root changelog entry, commit, tag, push.
#   4. Create the GitHub release as a draft, with that changelog entry as its notes.
#   5. Wait for .github/workflows/release.yml (started by the tag push) to publish the images
#      and attach the tarballs, then publish the draft. A failed run leaves the draft private.
#
# The release is published from here, with the caller's credentials, not by the workflow:
# Zenodo archives a published release and is not reliably triggered by GITHUB_TOKEN.
#
# --dry-run stops after step 2: nothing is versioned, committed, tagged or published.

cd "$(dirname "$0")/.."

DRY_RUN=false
case "${1:-}" in
  --dry-run) DRY_RUN=true ;;
  "") ;;
  *) echo "Usage: $0 [--dry-run]" >&2; exit 1 ;;
esac

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree not clean. Commit or stash changes first." >&2
  exit 1
fi

if ! ls .changeset/*.md >/dev/null 2>&1; then
  echo "No pending changesets in .changeset/ — nothing to release." >&2
  exit 1
fi

if ! command -v gh >/dev/null 2>&1 || ! gh auth status >/dev/null 2>&1; then
  echo "gh is required and must be signed in (gh auth login): it runs the checks and publishes the release." >&2
  exit 1
fi

if [[ "$(git branch --show-current)" != "master" ]]; then
  echo "Releases are cut from master." >&2
  exit 1
fi
git fetch -q origin master
if [[ "$(git rev-parse HEAD)" != "$(git rev-parse origin/master)" ]]; then
  echo "master is not in sync with origin/master. Push or pull first." >&2
  exit 1
fi

# The image build installs with a frozen lockfile; a stale one only fails there otherwise.
echo "Checking pnpm-lock.yaml is current..."
pnpm install --frozen-lockfile --lockfile-only --ignore-scripts >/dev/null

# Newest run id of a workflow on a ref, or 0.
latest_run() {
  gh run list --workflow "$1" --branch "$2" --limit 1 --json databaseId -q '.[0].databaseId // 0'
}

# Waits for a run of workflow $1 on ref $2 newer than run id $3 to finish; fails if it fails.
watch_run() {
  local workflow=$1 ref=$2 before=$3 run_id="" attempt
  for attempt in $(seq 1 30); do
    run_id=$(latest_run "$workflow" "$ref")
    [[ "$run_id" -gt "$before" ]] && break
    run_id=""
    sleep 2
  done
  if [[ -z "$run_id" ]]; then
    echo "Could not find the $workflow run." >&2
    return 1
  fi
  echo "Watching $workflow run $run_id..."
  gh run watch "$run_id" --exit-status >/dev/null
}

echo "Running the release image build check in CI..."
BEFORE=$(latest_run release-check.yml master)
gh workflow run release-check.yml --ref master
if ! watch_run release-check.yml master "$BEFORE"; then
  echo "The release check failed. Nothing was versioned, tagged or published. See: gh run list --workflow release-check.yml" >&2
  exit 1
fi

if $DRY_RUN; then
  echo "Dry run passed: a release from this commit would build."
  exit 0
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

# A draft stays private until the publish workflow has attached the images and tarballs.
gh release create "$TAG" --draft --title "$TAG" --notes-file "$NOTES"

echo "Waiting for the Release package workflow (images and tarballs)..."
if watch_run release.yml "$TAG" 0; then
  gh release edit "$TAG" --draft=false --latest
  echo
  echo "Published: https://github.com/veysur/veysur/releases/tag/$TAG"
else
  echo >&2
  echo "The Release package workflow failed. $TAG is still a private draft, so nothing is public." >&2
  echo "Fix the cause, then re-run it and publish the draft:" >&2
  echo "  gh workflow run release.yml -f version=$VERSION" >&2
  echo "  gh run watch -R veysur/veysur" >&2
  echo "  gh release edit $TAG --draft=false --latest" >&2
  echo "If the fix changes the tagged commit, move the tag first (nothing is archived yet)." >&2
  exit 1
fi
