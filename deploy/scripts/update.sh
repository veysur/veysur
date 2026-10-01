#!/usr/bin/env bash
# cspell:ignore mysqldump gzip uroot
# Forward-only upgrade to a new release: snapshot, migrate, recreate, verify.
# A failed health check re-pins the previous image tag and restarts it. The
# snapshot is the recovery path if a migration itself fails.
set -euo pipefail
# shellcheck source=lib/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

TARGET="latest" ASSUME_YES=false FORCE=false OFFLINE_DIR=""

while [ $# -gt 0 ]; do
  case $1 in
    --tag | --version) TARGET=$2; shift 2 ;;
    --yes | -y) ASSUME_YES=true; shift ;;
    --force) FORCE=true; shift ;;
    --offline) OFFLINE_DIR=$2; shift 2 ;;
    --help | -h)
      cat <<USAGE
Usage: $0 [--tag <version>] [--yes] [--force] [--offline <dir>]

  --tag <version>   Release to install (default: latest)
  --yes, -y         Do not ask for confirmation
  --force           Allow skipping a major version
  --offline <dir>   Load image archives (*.tar) from <dir> instead of pulling
USAGE
      exit 0 ;;
    *) die "unknown option: $1" ;;
  esac
done

preflight
require_env_file
require_env_keys
check_ports

PREVIOUS=$(env_get VEYSUR_IMAGE_TAG)
PREVIOUS=${PREVIOUS:-latest}
BACKUP_DIR="$DEPLOY_DIR/backups"

major() { printf '%s' "${1#v}" | sed -n 's/^\([0-9][0-9]*\)\..*/\1/p'; }
prev_major=$(major "$PREVIOUS")
target_major=$(major "$TARGET")
if [ -n "$prev_major" ] && [ -n "$target_major" ] && [ "$target_major" -gt $((prev_major + 1)) ] && ! $FORCE; then
  die "$PREVIOUS to $TARGET skips a major version. Upgrade to $((prev_major + 1)).x first, or pass --force."
fi

echo "Upgrade: ${YELLOW}$PREVIOUS${NC} -> ${YELLOW}$TARGET${NC}"
echo "Check the release notes for breaking changes before continuing."
if ! $ASSUME_YES; then
  read -r -p "Proceed? [y/N] " confirm || true
  [ "${confirm:-}" = y ] || [ "${confirm:-}" = Y ] || die "cancelled"
fi

if [ -n "$OFFLINE_DIR" ]; then
  info "Loading images from $OFFLINE_DIR"
  shopt -s nullglob
  archives=("$OFFLINE_DIR"/*.tar)
  [ ${#archives[@]} -gt 0 ] || die "no *.tar archives in $OFFLINE_DIR"
  for archive in "${archives[@]}"; do docker load -i "$archive" >/dev/null; done
else
  info "Pulling $TARGET"
  VEYSUR_IMAGE_TAG=$TARGET compose pull api nginx || die "could not pull $TARGET; nothing was changed"
fi

info "Snapshotting the database"
mkdir -p "$BACKUP_DIR"
snapshot="$BACKUP_DIR/veysur-$(date +%Y%m%d-%H%M%S)-before-$TARGET.sql.gz"
mysql_dump_to "$snapshot" || die "database snapshot failed; nothing was changed"
ok "Snapshot: $snapshot"

env_set VEYSUR_IMAGE_TAG "$TARGET"

rollback() {
  warn "Rolling back to $PREVIOUS"
  env_set VEYSUR_IMAGE_TAG "$PREVIOUS"
  compose up -d --wait || warn "the previous version did not become healthy either"
  echo "If a migration changed the schema, restore the snapshot: $snapshot"
}

info "Running database migrations"
if ! compose --profile tools run --rm migrate; then
  env_set VEYSUR_IMAGE_TAG "$PREVIOUS"
  die "migration failed. Restore the snapshot if the schema was partly changed: $snapshot"
fi

info "Recreating containers"
if ! compose up -d --wait || ! wait_for_api 30; then
  rollback
  die "health check failed on $TARGET; rolled back to $PREVIOUS"
fi

ok "Updated to $TARGET"
