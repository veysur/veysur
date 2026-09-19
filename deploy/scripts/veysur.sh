#!/usr/bin/env bash
# Thin operator vocabulary over docker compose.
set -euo pipefail
# shellcheck source=lib/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

usage() {
  cat <<USAGE
Usage: $0 <command>

  status            Show service state
  logs [service]    Follow logs (nginx, caddy, api, task-manager, mysql, redis)
  restart [service] Restart one service or the whole stack
  stop              Stop the stack (data is kept)
USAGE
}

require_docker
require_env_file

case "${1:-}" in
  status) compose ps ;;
  logs) shift; compose logs -f --tail 100 "$@" ;;
  restart) shift; compose restart "$@" ;;
  stop) compose stop ;;
  --help | -h | "") usage ;;
  *) usage >&2; die "unknown command: $1" ;;
esac
