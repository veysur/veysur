#!/usr/bin/env bash
# cspell:ignore gzip caddy uroot
# Restores a backup.sh archive: .env, certificates, databases and uploaded files.
# Works on the same host or on a fresh one (moving servers). It replaces what is
# there, so it asks first.
set -euo pipefail
# shellcheck source=lib/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

ARCHIVE="" ASSUME_YES=false START=true

while [ $# -gt 0 ]; do
  case $1 in
    --yes | -y) ASSUME_YES=true; shift ;;
    --no-start) START=false; shift ;;
    --help | -h)
      cat <<USAGE
Usage: $0 <archive> [--yes] [--no-start]

  <archive>     A veysur-backup-*.tar written by backup.sh
  --yes, -y     Do not ask for confirmation
  --no-start    Restore the data and .env, but do not start the stack. Use this when
                the domain is changing: edit .env (or run config-generate.sh), then
                run ./scripts/deploy.sh.

Replaces this host's .env (the old one is kept as .env.pre-restore-<time>), the
databases, the uploaded files and, if the archive has them, certificates.
USAGE
      exit 0 ;;
    -*) die "unknown option: $1" ;;
    *) ARCHIVE=$1; shift ;;
  esac
done
[ -n "$ARCHIVE" ] || die "an archive is required: $0 <archive>"
[ -f "$ARCHIVE" ] || die "$ARCHIVE not found"

require_docker
umask 077
STAGE=$(mktemp -d "$DEPLOY_DIR/.restore-XXXXXX")
trap 'rm -rf "$STAGE"' EXIT

info "Reading $ARCHIVE"
tar -xf "$ARCHIVE" -C "$STAGE" || die "could not read the archive"
DIR=$(find "$STAGE" -mindepth 1 -maxdepth 1 -type d | head -n 1)
for part in MANIFEST env database.sql.gz; do
  [ -f "$DIR/$part" ] || die "the archive has no $part; it was not made by backup.sh"
done
manifest() { sed -n "s/^$1=//p" "$DIR/MANIFEST" | tail -n 1; }
# S3 installs have no files archive: their files stay in the buckets.
HAS_FILES=false
case " $(manifest includes) " in *" files "*) HAS_FILES=true ;; esac
if $HAS_FILES; then
  [ -f "$DIR/files.tar.gz" ] || die "the archive has no files.tar.gz; it was not made by backup.sh"
  gzip -t "$DIR/files.tar.gz" || die "the archive is damaged"
fi
gzip -t "$DIR/database.sql.gz" || die "the archive is damaged"

echo "Backup of ${YELLOW}$(manifest domain)${NC}, taken $(manifest created_at), release $(manifest image_tag)."
if [ -f "$DEPLOY_DIR/VERSION" ] && [ "$(cat "$DEPLOY_DIR/VERSION")" != "$(manifest image_tag)" ]; then
  warn "this is release $(cat "$DEPLOY_DIR/VERSION") but the backup came from $(manifest image_tag)."
  warn "The restored .env pins $(manifest image_tag). To go to the newer release afterwards: ./scripts/update.sh --tag $(cat "$DEPLOY_DIR/VERSION")"
fi
echo "This replaces the .env and databases on this host, and the uploaded files if the backup holds them."
if ! $ASSUME_YES; then
  read -r -p "Continue? [y/N] " confirm || true
  [ "${confirm:-}" = y ] || [ "${confirm:-}" = Y ] || die "cancelled"
fi

# .env first: every compose command needs it, and a fresh MySQL volume is
# initialised with the passwords in it.
if [ -f "$ENV_FILE" ]; then
  kept="$ENV_FILE.pre-restore-$(date +%Y%m%d-%H%M%S)"
  cp "$ENV_FILE" "$kept"
  ok "Kept the current .env as $kept"
fi
cat "$DIR/env" >"$ENV_FILE"
chmod 600 "$ENV_FILE"
if [ -d "$DIR/certs" ]; then
  mkdir -p "$DEPLOY_DIR/certs"
  cp -r "$DIR/certs/." "$DEPLOY_DIR/certs/"
fi

if [ -n "$(compose ps -q 2>/dev/null)" ]; then
  info "Stopping the running stack (data volumes are kept)"
  compose down
fi

info "Starting MySQL"
compose up -d --wait mysql || die "MySQL did not start. See: ./scripts/veysur.sh logs mysql"
# The health check passes even with a wrong password, so try a real login. A MySQL
# volume keeps the passwords it was created with, whatever .env says now.
if ! compose exec -T mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "SELECT 1"' >/dev/null 2>&1; then
  volume=$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/var/lib/mysql"}}{{.Name}}{{end}}{{end}}' "$(compose ps -q mysql)")
  die "MySQL rejected the root password from the backup's .env: this host has a MySQL volume from a different install. Nothing was changed in it. To restore over it, delete that volume (and its data) with: docker volume rm $volume  (stop the stack first with: docker compose down). Then run the restore again. Your previous .env is kept as .env.pre-restore-*."
fi

info "Restoring the databases"
mysql_app_databases | sed 's/.*/DROP DATABASE `&`;/' |
  compose exec -T mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD"'
gzip -dc "$DIR/database.sql.gz" | compose exec -T mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD"'

if $HAS_FILES; then
  info "Restoring uploaded files"
  gzip -dc "$DIR/files.tar.gz" |
    compose run --rm --no-deps -T --entrypoint sh api -c 'find /data/files -mindepth 1 -delete && tar -xf - -C /data/files'
else
  warn "This backup holds no uploaded files: they are in the S3 buckets named in the restored .env. Restore those separately if they were lost."
fi

if [ -f "$DIR/caddy-data.tar.gz" ]; then
  info "Restoring Caddy's certificate store"
  gzip -dc "$DIR/caddy-data.tar.gz" |
    compose run --rm --no-deps -T --entrypoint sh caddy -c 'find /data -mindepth 1 -delete && tar -xf - -C /data'
fi

ok "Data restored"
# exec skips the EXIT trap, so clear the extracted archive first.
rm -rf "$STAGE"
if $START; then
  exec "$SCRIPT_DIR/deploy.sh"
fi
echo "Not started. Review $ENV_FILE, then run ./scripts/deploy.sh"
