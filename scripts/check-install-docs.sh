#!/usr/bin/env bash
# Guard against install instructions pinned to one release.
#
# The docs download releases/latest/download/veysur.tar.gz, a fixed-name copy that
# .github/workflows/release.yml attaches to every release. A literal
# releases/download/v<version> link goes stale at the next release.
#
set -euo pipefail

cd "$(dirname "$0")/.."

status=0

if git --no-pager grep -nE 'releases/download/v[0-9]' \
  -- 'README.md' 'docs' 'deploy/README.md' 'package/docsite/src'; then
  echo
  echo "ERROR: version-pinned install link found. Use releases/latest/download/veysur.tar.gz."
  status=1
fi

if ! grep -q 'veysur.tar.gz' .github/workflows/release.yml; then
  echo "ERROR: release.yml no longer attaches the fixed-name veysur.tar.gz the install docs link to."
  status=1
fi

[ "$status" -eq 0 ] && echo "install-docs guard: clean"
exit "$status"
