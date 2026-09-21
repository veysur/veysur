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
  mail-test <to>    Send a test e-mail through the configured SMTP relay
USAGE
}

# Sends through the api container's own mail settings, so it tests exactly what
# the application will use. The message is built in Node, not shell, so a quote in
# the brand name cannot break the JSON. The task runner exits 0 even when the send
# fails, so success is judged by its "Completed" line, not the exit code.
mail_test() {
  local to=${1:-} output
  [[ $to =~ ^[^[:space:]\"\\@]+@[^[:space:]\"\\@]+$ ]] || die "usage: $0 mail-test <address>"
  output=$(compose exec -T -e MAIL_TEST_TO="$to" api node -e '
const e = process.env
e.API_TASK = "email"
e.API_ACTION = "sendDirect"
e.API_TASK_JSON = JSON.stringify({
  to: e.MAIL_TEST_TO,
  from: { name: e.API_MAIL_FROM_NAME || null, email: e.API_MAIL_ADDRESS_FROM },
  subject: "VeySur mail test",
  text: "If you can read this, outbound mail from your VeySur install works.",
})
require("./dist/run.js")
' 2>&1) || true
  if ! grep -q '^\[Task\] Completed email.sendDirect' <<<"$output"; then
    grep -E '^(STARTUP ERROR|.*Error:)' <<<"$output" | head -n 3 >&2 || true
    die "the test e-mail was not sent. Check the SMTP settings in .env (see docs/email.md)."
  fi
  ok "Accepted by the relay. Check the inbox of $to (and its spam folder)."
}

require_docker
require_env_file
detect_dev

case "${1:-}" in
  status) compose ps ;;
  logs) shift; compose logs -f --tail 100 "$@" ;;
  restart) shift; compose restart "$@" ;;
  stop) compose stop ;;
  mail-test) shift; mail_test "$@" ;;
  --help | -h | "") usage ;;
  *) usage >&2; die "unknown command: $1" ;;
esac
