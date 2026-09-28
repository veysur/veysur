#!/usr/bin/env bash
# Stops the dev stack. An abruptly killed `pnpm dev` (docker compose watch -
# closed terminal, workstation slept, etc.) can leave the underlying
# `docker compose ... watch` process running as an orphan, still holding
# project "veysur"'s exclusive lock. `docker compose down` alone doesn't
# touch that leftover process, so the next `pnpm dev` fails with "cannot
# take exclusive lock for project veysur". Clear any such straggler first.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

if pkill -f "compose.dev.yaml watch" 2>/dev/null; then
  warn "stopped a leftover 'pnpm dev' watch process that was still holding the compose lock"
fi

docker compose --project-directory "$DEPLOY_DIR" -f "$DEPLOY_DIR/compose.yaml" -f "$DEPLOY_DIR/compose.dev.yaml" down "$@"
