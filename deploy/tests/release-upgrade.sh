#!/usr/bin/env bash
# cspell:ignore healthchecks retag urandom
# Upgrade test: installs the previous release, seeds data through the API, upgrades to the release
# under test with update.sh, and checks the data survived. Also proves a failed health check rolls
# back to the previous version with the data intact.
#
# The previous release is installed from its own tarball with images pulled from ghcr.io. The new
# images come from the local Docker daemon and reach update.sh as an offline archive, so nothing
# unpublished is pushed or pulled. Uses its own Compose project and removes everything on exit.
set -uo pipefail

SRC_DEPLOY="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_DIR="$(cd "$SRC_DEPLOY/.." && pwd)"
HERE="$(dirname "${BASH_SOURCE[0]}")"

KEEP=false FROM_TARBALL="" REGISTRY="" TAG="" HTTP_PORT=""

usage() {
  cat <<USAGE
Usage: $0 --from-tarball <previous veysur-X.Y.Z.tar.gz> [options]

  --from-tarball <file>   The previous release's thin package (required). Its images are pulled
                          from ghcr.io at the version in its .env.example
  --registry <r> --tag <t>
                          New images already present locally, for example
                          --registry ghcr.io/veysur --tag 1.2.0. Without them they are built from
                          this checkout and tagged ghcr.io/veysur/{api,nginx}:0.0.0-upgrade
  --port <n>              Host port for the site (default: a free one)
  --keep                  Leave the stack and its temporary directory in place
  --help, -h              Show this help

Needs docker with the compose plugin, curl and jq, and network access to pull the previous images.
USAGE
}

while [ $# -gt 0 ]; do
  case $1 in
    --from-tarball) FROM_TARBALL=$2; shift 2 ;;
    --registry) REGISTRY=$2; shift 2 ;;
    --tag) TAG=$2; shift 2 ;;
    --port) HTTP_PORT=$2; shift 2 ;;
    --keep) KEEP=true; shift ;;
    --help | -h) usage; exit 0 ;;
    *) usage >&2; echo "unknown option: $1" >&2; exit 2 ;;
  esac
done
[ -n "$FROM_TARBALL" ] && [ -f "$FROM_TARBALL" ] || { usage >&2; echo "--from-tarball must name an existing file" >&2; exit 2; }
[ -z "$REGISTRY" ] || [ -n "$TAG" ] || { echo "--registry needs --tag" >&2; exit 2; }
[ -n "$REGISTRY" ] || [ -z "$TAG" ] || { echo "--tag needs --registry" >&2; exit 2; }

for tool in docker curl jq; do
  command -v "$tool" >/dev/null 2>&1 || { echo "$tool is required" >&2; exit 2; }
done
docker compose version >/dev/null 2>&1 || { echo "the docker compose plugin is required" >&2; exit 2; }

# shellcheck source=lib/release-lib.sh
source "$HERE/lib/release-lib.sh"
# shellcheck source=release-functional.sh
source "$HERE/release-functional.sh"

trap cleanup EXIT
trap 'exit 130' INT TERM

IMAGE_REPO=ghcr.io/veysur
NEW_TAG=${TAG:-0.0.0-upgrade}
BROKEN_TAG=0.0.0-broken

# ---- images under test -----------------------------------------------------

WORK=$(mktemp -d "${TMPDIR:-/tmp}/veysur-upgrade.XXXXXX")
mkdir -p "$WORK/offline-new" "$WORK/offline-broken"

if [ -n "$REGISTRY" ]; then
  for image in api nginx; do
    docker image inspect "$REGISTRY/$image:$TAG" >/dev/null 2>&1 || fail "image $REGISTRY/$image:$TAG is not present locally"
    [ "$REGISTRY" = "$IMAGE_REPO" ] || docker tag "$REGISTRY/$image:$TAG" "$IMAGE_REPO/$image:$NEW_TAG"
  done
else
  say "Building images"
  docker build -q -f "$SRC_DEPLOY/docker/Dockerfile.api" -t "$IMAGE_REPO/api:$NEW_TAG" "$REPO_DIR" >/dev/null || fail "api image build"
  docker build -q -f "$SRC_DEPLOY/docker/Dockerfile.nginx" -t "$IMAGE_REPO/nginx:$NEW_TAG" --build-arg BUILD_VERSION="$NEW_TAG" "$REPO_DIR" >/dev/null || fail "nginx image build"
fi
docker save "$IMAGE_REPO/api:$NEW_TAG" "$IMAGE_REPO/nginx:$NEW_TAG" -o "$WORK/offline-new/new.tar" || fail "could not archive the new images"

# An api image whose entrypoint exits straight away: migrations still run (the migrate service
# overrides the entrypoint) but the api never becomes healthy, which forces update.sh to roll back.
printf 'FROM %s\nENTRYPOINT ["sh", "-c", "exit 1"]\n' "$IMAGE_REPO/api:$NEW_TAG" | docker build -q -t "$IMAGE_REPO/api:$BROKEN_TAG" - >/dev/null || fail "could not build the broken api image"
docker tag "$IMAGE_REPO/nginx:$NEW_TAG" "$IMAGE_REPO/nginx:$BROKEN_TAG"
docker save "$IMAGE_REPO/api:$BROKEN_TAG" "$IMAGE_REPO/nginx:$BROKEN_TAG" -o "$WORK/offline-broken/broken.tar" || fail "could not archive the broken images"

# ---- install the previous release ------------------------------------------

say "Unpacking $(basename "$FROM_TARBALL")"
tar -xzf "$FROM_TARBALL" -C "$WORK" || fail "could not unpack the previous package"
PKG="$WORK/veysur"
for path in install.sh compose.yaml .env.example scripts/update.sh scripts/admin-account-bootstrap.sh VERSION; do
  [ -e "$PKG/$path" ] || fail "the previous package is missing $path"
done
FROM_VERSION=$(cat "$PKG/VERSION")
pass "previous package layout ($FROM_VERSION)"

[ -n "$HTTP_PORT" ] || HTTP_PORT=$(free_port) || fail "no free port found"
HTTPS_PORT=$(free_port) || fail "no free port found"
BASE="http://localhost:$HTTP_PORT"
export COMPOSE_PROJECT_NAME="veysur-upgrade-$$"
export VEYSUR_ENV_FILE="$PKG/.env"
# shellcheck source=../scripts/lib/common.sh
source "$SRC_DEPLOY/scripts/lib/common.sh"

say "Installing $FROM_VERSION (project $COMPOSE_PROJECT_NAME, $BASE)"
cp "$PKG/.env.example" "$PKG/.env"
env_set VEYSUR_HTTP_PORT "$HTTP_PORT"
env_set VEYSUR_HTTPS_PORT "$HTTPS_PORT"
env_set VEYSUR_TLS_SNIPPET ./caddy/tls-none.caddy
env_set VEYSUR_SITE_ADDRESS :80
expect_success "config-generate.sh (non-interactive)" ops scripts/config-generate.sh --non-interactive --domain localhost
env_set API_S3_PUBLIC_BASE_URL "$BASE"
expect_success "install.sh ($FROM_VERSION)" ops install.sh --yes --domain localhost
[ "$(env_get VEYSUR_IMAGE_TAG)" = "$FROM_VERSION" ] && pass ".env pins $FROM_VERSION" || fail ".env pins '$(env_get VEYSUR_IMAGE_TAG)', not $FROM_VERSION"

ADMIN_EMAIL="admin@veysur-upgrade.example"
ADMIN_PASSWORD="Upgrade-$(openssl rand -hex 8)-Aa1!"
expect_success "admin account created" ops scripts/admin-account-bootstrap.sh --email "$ADMIN_EMAIL" --password "$ADMIN_PASSWORD"
retry 30 2 "/api/ping returns 200" ping_ok

# ---- seed data on the previous release --------------------------------------

say "Seeding data on $FROM_VERSION"
admin_login
survey_journey
head -c 20000 /dev/urandom >"$WORK/seed.png"
upload_file "$WORK/seed.png" seed.png image/png
SEED_FILE_PATH=$UP_PATH

# verify_seed LABEL: logs in again and checks everything seeded is still there.
verify_seed() {
  local label=$1
  retry 30 2 "/api/ping returns 200 ($label)" ping_ok
  admin_login
  api GET "/survey/$SURVEY_ID"
  expect_status 200 "survey still readable ($label)"
  api GET "/survey-response/$SURVEY_ID?perPage=50"
  expect_status 200 "responses listed ($label)"
  expect_answer "the response is intact ($label)"
  http GET "$BASE/veysur-files/$SEED_FILE_PATH" -H 'Accept-Encoding: identity'
  expect_status 200 "uploaded file still readable ($label)"
  cmp -s "$WORK/seed.png" "$WORK/body" && pass "uploaded file bytes match ($label)" || fail "uploaded file bytes differ ($label)"
}

# ---- failed upgrade rolls back ----------------------------------------------

say "Failed upgrade to $BROKEN_TAG"
if ops scripts/update.sh --tag "$BROKEN_TAG" --yes --offline "$WORK/offline-broken" >"$WORK/out" 2>&1; then
  cat "$WORK/out" >&2
  fail "update.sh succeeded with an api that cannot start"
fi
grep -q "rolled back to $FROM_VERSION" "$WORK/out" && pass "update.sh reports the rollback" || { cat "$WORK/out" >&2; fail "update.sh did not report a rollback to $FROM_VERSION"; }
[ "$(env_get VEYSUR_IMAGE_TAG)" = "$FROM_VERSION" ] && pass ".env is pinned to $FROM_VERSION again" || fail ".env pins '$(env_get VEYSUR_IMAGE_TAG)' after the rollback"
verify_seed "after rollback"

# ---- upgrade -----------------------------------------------------------------

say "Upgrade $FROM_VERSION to $NEW_TAG"
expect_success "update.sh --tag $NEW_TAG" ops scripts/update.sh --tag "$NEW_TAG" --yes --offline "$WORK/offline-new"
[ "$(env_get VEYSUR_IMAGE_TAG)" = "$NEW_TAG" ] && pass ".env pins $NEW_TAG" || fail ".env pins '$(env_get VEYSUR_IMAGE_TAG)', not $NEW_TAG"
api_image=$(docker inspect -f '{{.Config.Image}}' "$(dc ps -q api)")
[ "$api_image" = "$IMAGE_REPO/api:$NEW_TAG" ] && pass "api runs $api_image" || fail "api runs $api_image"
verify_seed "after upgrade"

expect_success "no migrations pending" dc --profile tools run --rm migrate --dry-run

say "Second update is harmless"
expect_success "update.sh --tag $NEW_TAG (again)" ops scripts/update.sh --tag "$NEW_TAG" --yes --offline "$WORK/offline-new"
verify_seed "after the second update"

say "All checks passed ($PASSED)"
