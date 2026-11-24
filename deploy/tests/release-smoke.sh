#!/usr/bin/env bash
# cspell:ignore healthchecks retag retagged
# Fresh-install smoke test of a release package.
#
# Unpacks the operator tarball (the shipped package, not the repo checkout) into a temporary
# directory, installs it with install.sh against locally available images, creates the first
# administrator, and checks that the stack answers: API ping, the three app shells, an admin login
# and container health. Nothing outside the temporary directory and the veysur-smoke-* Compose
# project is touched, so it is safe next to a real install. See ./release-smoke.sh --help.
#
# A failed check stops the run and prints the container state and logs.
set -uo pipefail

SRC_DEPLOY="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_DIR="$(cd "$SRC_DEPLOY/.." && pwd)"

KEEP=false SKIP_FUNCTIONAL=false BROWSER=false TARBALL="" REGISTRY="" TAG="" HTTP_PORT=""

usage() {
  cat <<USAGE
Usage: $0 --tarball <veysur-X.Y.Z.tar.gz> [options]

  --tarball <file>        The thin operator package to install (required)
  --registry <r> --tag <t>
                          Images already present locally, for example the ones release.yml built
                          (--registry ghcr.io/veysur --tag 1.2.0). Without them the images are
                          built from this checkout
  --port <n>              Host port for the site (default: a free one)
  --skip-functional       Stop after the smoke checks; skip the survey, file and backup journey
  --browser               After the functional journey, run the Playwright specs in browser/
                          (needs node and npm; run 'npx playwright install chromium' first)
  --keep                  Leave the stack and its temporary directory in place
  --help, -h              Show this help

Needs docker with the compose plugin, curl and jq, about 3 GB of RAM and network access to pull
the mysql, redis and caddy images. The images are retagged locally, so nothing is pulled for them.
USAGE
}

while [ $# -gt 0 ]; do
  case $1 in
    --tarball) TARBALL=$2; shift 2 ;;
    --registry) REGISTRY=$2; shift 2 ;;
    --tag) TAG=$2; shift 2 ;;
    --port) HTTP_PORT=$2; shift 2 ;;
    --skip-functional) SKIP_FUNCTIONAL=true; shift ;;
    --browser) BROWSER=true; shift ;;
    --keep) KEEP=true; shift ;;
    --help | -h) usage; exit 0 ;;
    *) usage >&2; echo "unknown option: $1" >&2; exit 2 ;;
  esac
done
[ -n "$TARBALL" ] && [ -f "$TARBALL" ] || { usage >&2; echo "--tarball must name an existing file" >&2; exit 2; }
! { $BROWSER && $SKIP_FUNCTIONAL; } || { echo "--browser needs the functional journey it builds on" >&2; exit 2; }
[ -z "$REGISTRY" ] || [ -n "$TAG" ] || { echo "--registry needs --tag" >&2; exit 2; }
[ -n "$REGISTRY" ] || [ -z "$TAG" ] || { echo "--tag needs --registry" >&2; exit 2; }

for tool in docker curl jq; do
  command -v "$tool" >/dev/null 2>&1 || { echo "$tool is required" >&2; exit 2; }
done
docker compose version >/dev/null 2>&1 || { echo "the docker compose plugin is required" >&2; exit 2; }

# shellcheck source=lib/release-lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/release-lib.sh"

trap cleanup EXIT
trap 'exit 130' INT TERM

# ---- setup -----------------------------------------------------------------

WORK=$(mktemp -d "${TMPDIR:-/tmp}/veysur-smoke.XXXXXX")
say "Unpacking $(basename "$TARBALL")"
tar -xzf "$TARBALL" -C "$WORK" || fail "could not unpack the tarball"
PKG="$WORK/veysur"
for path in install.sh compose.yaml .env.example scripts/admin-account-bootstrap.sh VERSION; do
  [ -e "$PKG/$path" ] || fail "the package is missing $path"
done
pass "package layout ($(cat "$PKG/VERSION"))"

# The retag keeps deploy.sh's image pull from replacing the images under test with published ones.
IMAGE_REGISTRY=veysur-smoke IMAGE_TAG=smoke
if [ -n "$REGISTRY" ]; then
  for image in api nginx; do
    docker image inspect "$REGISTRY/$image:$TAG" >/dev/null 2>&1 || fail "image $REGISTRY/$image:$TAG is not present locally"
    docker tag "$REGISTRY/$image:$TAG" "$IMAGE_REGISTRY/$image:$IMAGE_TAG"
  done
else
  say "Building images"
  docker build -q -f "$SRC_DEPLOY/docker/Dockerfile.api" -t "$IMAGE_REGISTRY/api:$IMAGE_TAG" "$REPO_DIR" >/dev/null || fail "api image build"
  docker build -q -f "$SRC_DEPLOY/docker/Dockerfile.nginx" -t "$IMAGE_REGISTRY/nginx:$IMAGE_TAG" --build-arg BUILD_VERSION="$IMAGE_TAG" "$REPO_DIR" >/dev/null || fail "nginx image build"
fi

[ -n "$HTTP_PORT" ] || HTTP_PORT=$(free_port) || fail "no free port found"
HTTPS_PORT=$(free_port) || fail "no free port found"
BASE="http://localhost:$HTTP_PORT"
export COMPOSE_PROJECT_NAME="veysur-smoke-$$"
export VEYSUR_ENV_FILE="$PKG/.env"

# Only env_set and env_get are used from common.sh; it must be sourced after VEYSUR_ENV_FILE is set.
# shellcheck source=../scripts/lib/common.sh
source "$SRC_DEPLOY/scripts/lib/common.sh"

say "Installing in $PKG (project $COMPOSE_PROJECT_NAME, $BASE)"
cp "$PKG/.env.example" "$PKG/.env"
env_set VEYSUR_IMAGE_REGISTRY "$IMAGE_REGISTRY"
env_set VEYSUR_IMAGE_TAG "$IMAGE_TAG"
env_set VEYSUR_HTTP_PORT "$HTTP_PORT"
env_set VEYSUR_HTTPS_PORT "$HTTPS_PORT"
env_set VEYSUR_TLS_SNIPPET ./caddy/tls-none.caddy
env_set VEYSUR_SITE_ADDRESS :80
expect_success "config-generate.sh (non-interactive)" ops scripts/config-generate.sh --non-interactive --domain localhost
env_set API_S3_PUBLIC_BASE_URL "$BASE"
# install.sh skips config-generate.sh because .env exists, then runs deploy.sh.
expect_success "install.sh" ops install.sh --yes --domain localhost

ADMIN_EMAIL="admin@veysur-smoke.example"
ADMIN_PASSWORD="Smoke-$(openssl rand -hex 8)-Aa1!"
expect_success "admin account created" ops scripts/admin-account-bootstrap.sh --email "$ADMIN_EMAIL" --password "$ADMIN_PASSWORD"

# ---- assertions ------------------------------------------------------------

say "Checks"

retry 30 2 "/api/ping returns 200" ping_ok

for app in admin survey account; do
  http GET "$BASE/$app/" -H 'Accept: text/html'
  expect_status 200 "$app app shell"
  grep -q 'id="root"' "$WORK/body" && pass "$app shell has its mount point" || fail "$app shell has no id=\"root\" element"
done

admin_login

solve_bot_check
login "wrong-password"
case $STATUS in 4??) pass "wrong password is refused (HTTP $STATUS)" ;; *) fail "wrong password returned HTTP $STATUS" ;; esac

# task-manager's healthcheck has a 15 minute start period, so "starting" is fine for it alone.
mapfile -t containers < <(dc ps -a -q)
[ "${#containers[@]}" -ge 5 ] || fail "expected at least 5 containers, found ${#containers[@]}"
for id in "${containers[@]}"; do
  name=$(docker inspect -f '{{index .Config.Labels "com.docker.compose.service"}}' "$id")
  state=$(docker inspect -f '{{.State.Status}}' "$id")
  health=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$id")
  restarts=$(docker inspect -f '{{.RestartCount}}' "$id")
  [ "$state" = running ] || fail "$name is $state, not running"
  [ "$restarts" = 0 ] || fail "$name has restarted $restarts times"
  case $health in
    healthy | none) ;;
    starting) [ "$name" = task-manager ] || fail "$name is still starting" ;;
    *) fail "$name is $health" ;;
  esac
done
pass "all ${#containers[@]} containers running, healthy and not restarting"

if ! $SKIP_FUNCTIONAL; then
  # shellcheck source=release-functional.sh
  source "$(dirname "${BASH_SOURCE[0]}")/release-functional.sh"
  functional_checks
  if $BROWSER; then
    # shellcheck source=release-browser.sh
    source "$(dirname "${BASH_SOURCE[0]}")/release-browser.sh"
    browser_checks
  fi
fi

say "All checks passed ($PASSED)"
