#!/usr/bin/env bash
# Guard against the private commercial monorepo's name leaking into this
# public, source-available repo (comments, docs, scripts). This repo talks
# about the commercial edition only in generic terms (the composition seam,
# "a commercial overlay", package names like veysur-app-cloud) — never by the
# private repo's own name or by pointing at its internal doc paths.
set -euo pipefail

cd "$(dirname "$0")/.."

PATTERN='veysur-cloud'

# CLA/CONTRIBUTING's generic "private commercial platform code" disclosure
# never names the repo, so nothing needs excluding there.
if git grep -ilE "$PATTERN" -- . ':(exclude)scripts/check-no-private-repo-refs.sh'; then
  echo
  echo "ERROR: private repo name found in a public-repo file (see above)."
  echo "Describe the commercial edition generically instead of naming the private repo."
  exit 1
fi

echo "private-repo-ref guard: clean"
