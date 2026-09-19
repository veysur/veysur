#!/usr/bin/env bash
# First install and config changes. Non-interactive and idempotent: safe to
# re-run after editing .env (containers whose config changed are recreated).
set -euo pipefail
# shellcheck source=lib/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

DRY_RUN=false
while [ $# -gt 0 ]; do
  case $1 in
    --dry-run) DRY_RUN=true; shift ;;
    --help | -h)
      echo "Usage: $0 [--dry-run]"
      echo "  --dry-run  Print the resolved configuration (secrets hidden); change nothing"
      exit 0 ;;
    *) die "unknown option: $1" ;;
  esac
done

preflight
require_env_file
require_env_keys

if $DRY_RUN; then
  compose config | mask_secrets
  echo
  info "Pending migrations:"
  compose --profile tools run --rm migrate --dry-run
  exit 0
fi

first_run=false
[ -n "$(env_get API_PROJECT_OWNER_ID)" ] || first_run=true

info "Pulling images"
compose pull --quiet --ignore-pull-failures || warn "could not pull images; using local copies"

info "Starting MySQL and Redis"
compose up -d --wait mysql redis

info "Running database migrations"
compose --profile tools run --rm migrate

info "Starting the stack"
compose up -d --wait

info "Checking the API"
wait_for_api 30 || die "the API did not answer /api/ping. See: ./scripts/veysur.sh logs api"

ok "VeySur is running at $(env_get API_S3_PUBLIC_BASE_URL)"
if $first_run; then
  echo
  echo "No administrator exists yet. Create the first account with:"
  echo "  ./scripts/admin-account-bootstrap.sh --email $(env_get VEYSUR_ADMIN_EMAIL)"
fi
