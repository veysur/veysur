#!/usr/bin/env bash
# cspell:ignore mysqldump gzip caddy
# On-demand backup: databases, uploaded files, .env and custom certificates in
# one archive. Safe to run while the stack is up. Restore with restore.sh.
# Redis is not backed up: it holds only cache and rate-limit counters.
set -euo pipefail
# shellcheck source=lib/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

OUT_DIR="$DEPLOY_DIR/backups" KEEP=0 WITH_CADDY=false

while [ $# -gt 0 ]; do
  case $1 in
    --output) OUT_DIR=$2; shift 2 ;;
    --keep) KEEP=$2; shift 2 ;;
    --include-caddy-data) WITH_CADDY=true; shift ;;
    --help | -h)
      cat <<USAGE
Usage: $0 [--output <dir>] [--keep <n>] [--include-caddy-data]

  --output <dir>          Directory for the archive (default: deploy/backups)
  --keep <n>              Keep only the newest <n> archives in that directory
  --include-caddy-data    Also save Caddy's certificate store, so a restore does
                          not need to request certificates again

Writes veysur-backup-<timestamp>.tar. The archive contains .env, so it holds every
secret and the encryption keys: store it encrypted and away from this host.
USAGE
      exit 0 ;;
    *) die "unknown option: $1" ;;
  esac
done
case $KEEP in '' | *[!0-9]*) die "--keep needs a whole number" ;; esac

preflight
require_env_file
compose ps --status running --services 2>/dev/null | grep -qx mysql ||
  die "MySQL is not running, so there is nothing to dump. Start the stack with ./scripts/deploy.sh."

umask 077
mkdir -p "$OUT_DIR"
name="veysur-backup-$(date +%Y%m%d-%H%M%S)"
archive="$OUT_DIR/$name.tar"
STAGE="$OUT_DIR/.staging-$name"
trap 'rm -rf "$STAGE" "$archive.partial"' EXIT
mkdir -p "$STAGE/$name"
DIR="$STAGE/$name"

info "Dumping the databases"
mysql_dump_to "$DIR/database.sql.gz" || die "database dump failed; no backup was written"

# A throwaway container mounts the volume, so this works whatever state the api is in.
info "Archiving uploaded files"
compose run --rm --no-deps -T --entrypoint tar api -C /data/files -czf - . >"$DIR/files.tar.gz" ||
  die "could not archive the files volume; no backup was written"
gzip -t "$DIR/files.tar.gz" || die "the files archive is corrupt; no backup was written"

info "Saving configuration"
cp "$ENV_FILE" "$DIR/env"
[ ! -d "$DEPLOY_DIR/certs" ] || cp -r "$DEPLOY_DIR/certs" "$DIR/certs"

includes="database files env certs"
if $WITH_CADDY; then
  info "Archiving Caddy's certificate store"
  compose run --rm --no-deps -T --entrypoint tar caddy -C /data -czf - . >"$DIR/caddy-data.tar.gz" ||
    die "could not archive Caddy data; no backup was written"
  includes="$includes caddy-data"
fi

cat >"$DIR/MANIFEST" <<MANIFEST
format=1
created_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
image_tag=$(env_get VEYSUR_IMAGE_TAG)
domain=$(env_get API_WEB_DOMAIN)
includes=$includes
MANIFEST

tar -C "$STAGE" -cf "$archive.partial" "$name"
mv "$archive.partial" "$archive"

if [ "$KEEP" -gt 0 ]; then
  # shellcheck disable=SC2012
  ls -1t "$OUT_DIR"/veysur-backup-*.tar 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f --
fi

ok "Backup: $archive ($(du -h "$archive" | cut -f1))"
warn "It contains .env: every secret and the encryption keys. Keep it encrypted and off this host."
