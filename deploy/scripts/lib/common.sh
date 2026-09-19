#!/usr/bin/env bash
# cspell:ignore tmpfile nproc proc meminfo
# Shared helpers for the operator scripts. Source, do not execute.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[1]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="${VEYSUR_ENV_FILE:-$DEPLOY_DIR/.env}"
ENV_EXAMPLE="$DEPLOY_DIR/.env.example"

RED=$'\033[0;31m'
GREEN=$'\033[0;32m'
YELLOW=$'\033[1;33m'
BLUE=$'\033[0;34m'
NC=$'\033[0m'

info() { echo "${BLUE}==>${NC} $*"; }
ok() { echo "${GREEN}✓${NC} $*"; }
warn() { echo "${YELLOW}!${NC} $*" >&2; }
die() {
  echo "${RED}✗ $*${NC}" >&2
  exit 1
}

compose() {
  docker compose --env-file "$ENV_FILE" -f "$DEPLOY_DIR/compose.yaml" "$@"
}

require_docker() {
  command -v docker >/dev/null 2>&1 || die "docker is not installed. See https://docs.docker.com/engine/install/"
  docker compose version >/dev/null 2>&1 || die "the 'docker compose' plugin (v2.22 or later) is not installed"
  docker info >/dev/null 2>&1 || die "cannot talk to the Docker daemon (is it running, and are you in the docker group?)"
}

# Refuses to continue below the supported minimum unless VEYSUR_SKIP_PREFLIGHT=1.
preflight() {
  require_docker
  local ram_kb cpus free_gb problems=0

  if [ -r /proc/meminfo ]; then
    ram_kb=$(awk '/^MemTotal:/ {print $2}' /proc/meminfo)
    if [ "${ram_kb:-0}" -lt 3800000 ]; then
      warn "RAM is $((ram_kb / 1024)) MB; at least 4 GB is required"
      problems=1
    fi
  fi

  cpus=$(nproc 2>/dev/null || echo 1)
  if [ "$cpus" -lt 2 ]; then
    warn "$cpus CPU core; at least 2 are recommended"
  fi

  free_gb=$(df -Pk "$(docker info --format '{{.DockerRootDir}}' 2>/dev/null || echo /)" 2>/dev/null | awk 'NR==2 {print int($4 / 1048576)}')
  if [ -n "${free_gb:-}" ] && [ "$free_gb" -lt 10 ]; then
    warn "only ${free_gb} GB free for Docker data; at least 10 GB is required"
    problems=1
  fi

  if [ "$problems" -ne 0 ] && [ "${VEYSUR_SKIP_PREFLIGHT:-0}" != "1" ]; then
    die "pre-flight checks failed. Set VEYSUR_SKIP_PREFLIGHT=1 to continue anyway."
  fi
}

env_get() {
  [ -f "$ENV_FILE" ] || return 0
  sed -n "s/^$1=//p" "$ENV_FILE" | tail -n 1
}

# Replaces KEY=value in FILE (default $ENV_FILE) or appends it. Values are
# passed through the environment so awk does not interpret backslashes.
env_set() {
  local key=$1 value=$2 file=${3:-$ENV_FILE} tmpfile
  tmpfile=$(mktemp)
  KEY="$key" VALUE="$value" awk '
    BEGIN { FS = "="; done = 0 }
    $1 == ENVIRON["KEY"] { print ENVIRON["KEY"] "=" ENVIRON["VALUE"]; done = 1; next }
    { print }
    END { if (!done) print ENVIRON["KEY"] "=" ENVIRON["VALUE"] }
  ' "$file" >"$tmpfile"
  cat "$tmpfile" >"$file"
  rm -f "$tmpfile"
}

# Hides secret values so output is safe to paste into a support thread.
mask_secrets() {
  sed -E 's/^([A-Za-z0-9_]*(PASSWORD|_KEY|SECRET|PASS)[A-Za-z0-9_]*)=.+$/\1=********/; s/^( *[A-Za-z0-9_]*(PASSWORD|_KEY|SECRET|PASS)[A-Za-z0-9_]*): .+$/\1: ********/'
}

random_hex() {
  openssl rand -hex "$1"
}

require_env_file() {
  [ -f "$ENV_FILE" ] || die "$ENV_FILE not found. Run ./scripts/config-generate.sh first."
}

# Fails if any key the stack cannot start without is empty.
require_env_keys() {
  local missing=() key
  for key in API_WEB_DOMAIN API_DOMAIN API_S3_PUBLIC_BASE_URL API_JWT_KEY MYSQL_ROOT_PASSWORD MYSQL_PASSWORD REDIS_PASSWORD; do
    [ -n "$(env_get "$key")" ] || missing+=("$key")
  done
  [ ${#missing[@]} -eq 0 ] || die "empty in $ENV_FILE: ${missing[*]}. Run ./scripts/config-generate.sh."

  # Caddy cannot parse its automatic-TLS snippet without a contact e-mail.
  case "$(env_get VEYSUR_TLS_SNIPPET)" in
    "" | *tls-auto*)
      [ -n "$(env_get VEYSUR_ACME_EMAIL)" ] || die "VEYSUR_ACME_EMAIL is empty in $ENV_FILE but automatic TLS needs a contact e-mail."
      ;;
  esac
}

# Waits for the front door to answer the API health endpoint through nginx.
wait_for_api() {
  local attempts=${1:-30} i
  for ((i = 1; i <= attempts; i++)); do
    if compose exec -T nginx wget -qO- http://127.0.0.1/api/ping 2>/dev/null | grep -q '"status":"ok"'; then
      return 0
    fi
    sleep 2
  done
  return 1
}
