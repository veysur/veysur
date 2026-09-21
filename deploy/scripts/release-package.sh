#!/usr/bin/env bash
# cspell:ignore gzip
# Builds the operator tarball: dist/veysur-<version>.tar.gz
set -euo pipefail
# shellcheck source=lib/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

VERSION="" WITH_IMAGES=false BUILD_IMAGES=false
while [ $# -gt 0 ]; do
  case $1 in
    --images) WITH_IMAGES=true; shift ;;
    --build-images) BUILD_IMAGES=true; WITH_IMAGES=true; shift ;;
    --help | -h)
      cat <<USAGE
Usage: $0 <version> [--build-images] [--images]

  <version>        Release version, for example 1.2.0
  --build-images   Build veysur/api and veysur/nginx at <version> first (implies --images)
  --images         Bundle veysur/api, veysur/nginx, mysql, redis and caddy as image
                   archives for air-gapped installs (larger tarball)
USAGE
      exit 0 ;;
    -*) die "unknown option: $1" ;;
    *) VERSION=$1; shift ;;
  esac
done
[ -n "$VERSION" ] || die "a version is required, for example: $0 1.2.0"
printf '%s' "$VERSION" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+([-.][0-9A-Za-z.]+)?$' || die "version must look like 1.2.3"

require_docker
REPO_DIR="$(cd "$DEPLOY_DIR/.." && pwd)"
OUT_DIR="$DEPLOY_DIR/dist"
STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT
ROOT="$STAGE/veysur"
mkdir -p "$ROOT" "$OUT_DIR"

if $BUILD_IMAGES; then
  info "Building images at $VERSION"
  docker build -q -f "$DEPLOY_DIR/docker/Dockerfile.api" -t "veysur/api:$VERSION" "$REPO_DIR" >/dev/null
  docker build -q -f "$DEPLOY_DIR/docker/Dockerfile.nginx" -t "veysur/nginx:$VERSION" --build-arg BUILD_VERSION="$VERSION" "$REPO_DIR" >/dev/null
fi

info "Staging files"
cd "$DEPLOY_DIR"
cp compose.yaml nginx.conf .env.example install.sh "$ROOT/"
cp -r caddy mysql "$ROOT/"
mkdir -p "$ROOT/scripts/lib" "$ROOT/certs"
cp scripts/config-generate.sh scripts/deploy.sh scripts/update.sh scripts/backup.sh scripts/restore.sh scripts/admin-account-bootstrap.sh scripts/veysur.sh "$ROOT/scripts/"
cp scripts/lib/common.sh "$ROOT/scripts/lib/"
cp certs/.gitkeep "$ROOT/certs/"
cp -r "$REPO_DIR/docs" "$ROOT/docs"
cp "$REPO_DIR/LICENSE" "$ROOT/LICENSE"
cp README.md "$ROOT/README.md"
env_set VEYSUR_IMAGE_TAG "$VERSION" "$ROOT/.env.example"
printf '%s\n' "$VERSION" >"$ROOT/VERSION"

if $WITH_IMAGES; then
  info "Bundling image archives (this takes a while)"
  mkdir -p "$ROOT/images"
  images=("veysur/api:$VERSION" "veysur/nginx:$VERSION" mysql:8.4 redis:7.2-alpine caddy:2-alpine)
  for image in "${images[@]}"; do
    docker image inspect "$image" >/dev/null 2>&1 || docker pull -q "$image" >/dev/null
  done
  docker save "${images[@]}" -o "$ROOT/images/veysur-$VERSION-images.tar"
fi

suffix=""
$WITH_IMAGES && suffix="-with-images"
archive="$OUT_DIR/veysur-$VERSION$suffix.tar.gz"
tar -C "$STAGE" -czf "$archive" veysur
ok "$archive ($(du -h "$archive" | cut -f1))"
