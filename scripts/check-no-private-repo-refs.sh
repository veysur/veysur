#!/usr/bin/env bash
# Guard against a private repo's name, or paths into its private packages,
# leaking into this public, source-available repo (comments, docs, scripts). This
# repo talks about extensions only in generic terms (the composition seam,
# package names like veysur-app-cloud), never by that private repo's own name or
# by pointing at its internal doc paths.
set -euo pipefail

cd "$(dirname "$0")/.."

# The private repo's name, and paths into its infra and k8s packages. package/api-cloud and
# package/app-cloud are named on purpose: they are the documented composition seam.
PATTERN='veysur-cloud|package/(k8s|infra)([^a-z-]|$)'

# CLA/CONTRIBUTING's generic disclosure never names the repo, so nothing
# needs excluding there.
if git grep -ilE "$PATTERN" -- . ':(exclude)scripts/check-no-private-repo-refs.sh'; then
  echo
  echo "ERROR: private repo name found in a public-repo file (see above)."
  echo "Describe extensions generically instead of naming the private repo."
  exit 1
fi

echo "private-repo-ref guard: clean"
