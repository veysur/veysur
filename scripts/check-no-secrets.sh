#!/usr/bin/env bash
# cspell:ignore zricethezav
# Guard against committing secrets (API keys, passwords, private keys) to this public repo.
#
# Scans the staged changes with gitleaks, using .gitleaks.toml. Uses a local `gitleaks`
# binary when present, otherwise the pinned container image. With neither available it
# warns and passes, so a missing tool never blocks a commit; CI runs the same scan over
# the full history as a backstop.
#
# Usage:
#   scripts/check-no-secrets.sh          scan staged changes (pre-commit)
#   scripts/check-no-secrets.sh --all    scan the full history (CI, manual audit)
set -euo pipefail

cd "$(dirname "$0")/.."

GITLEAKS_IMAGE='zricethezav/gitleaks:v8.30.1'

if [ "${1:-}" = '--all' ]; then
  ARGS=(git --log-opts='--all')
else
  ARGS=(git --staged --pre-commit)
fi
ARGS+=(--config .gitleaks.toml --redact --no-banner --verbose)

if command -v gitleaks >/dev/null 2>&1; then
  RUN=(gitleaks "${ARGS[@]}")
elif command -v docker >/dev/null 2>&1; then
  # Mount the worktree and git dir at their host paths so a submodule's .git file resolves.
  GIT_DIR_ABS="$(cd "$(git rev-parse --git-common-dir)" && pwd)"
  RUN=(docker run --rm -v "$PWD:$PWD" -v "$GIT_DIR_ABS:$GIT_DIR_ABS" -w "$PWD" "$GITLEAKS_IMAGE" "${ARGS[@]}")
else
  echo "WARNING: neither gitleaks nor docker found, skipping secret scan."
  echo "Install gitleaks (https://github.com/gitleaks/gitleaks) to enable it."
  exit 0
fi

if ! "${RUN[@]}"; then
  echo
  echo "ERROR: possible secret found (see above)."
  echo "Remove it and use a placeholder. If it is a false positive, add an allowlist"
  echo "entry to .gitleaks.toml rather than bypassing the check."
  exit 1
fi
