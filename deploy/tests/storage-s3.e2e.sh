#!/usr/bin/env bash
# cspell:ignore rustfs sigv hget priv urandom
# End-to-end test of S3 file storage on a throwaway self-hosted stack.
#
# Copies deploy/ to a temporary directory, starts the real stack there against a
# disposable S3 service (tests/compose.s3test.yaml), then uploads, reads, signs,
# deletes, backs up and restores files through nginx. Finishes by switching to
# local storage to confirm nothing regressed. Nothing outside the temporary
# directory and the veysur-s3test-* Compose project is touched, so it is safe next
# to a real install. See ./storage-s3.e2e.sh --help.
#
# The first failed check stops the run and prints the nginx and api logs.
set -uo pipefail

SRC_DEPLOY="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_DIR="$(cd "$SRC_DEPLOY/.." && pwd)"

KEEP=false SKIP_BUILD=false SKIP_LOCAL=false CLEAN_IMAGES=false
REGISTRY="" TAG="" HTTP_PORT="" HTTPS_PORT=""

usage() {
  cat <<USAGE
Usage: $0 [options]

  --keep                 Leave the stack and its temporary directory in place
  --skip-build           Reuse already built veysur-s3test/api and nginx images
  --registry <r> --tag <t>
                         Use published images instead of building, for example
                         --registry ghcr.io/veysur --tag latest
  --port <n>             Host port for the site (default: a free one)
  --skip-local           Skip the final local-storage regression run
  --clean-images         Remove the images this script built when it finishes
  --help, -h             Show this help

Needs docker with the compose plugin, curl, jq and sha256sum, about 3 GB of RAM
and network access to pull images. Takes a few minutes, longer with a first build.
USAGE
}

while [ $# -gt 0 ]; do
  case $1 in
    --keep) KEEP=true; shift ;;
    --skip-build) SKIP_BUILD=true; shift ;;
    --registry) REGISTRY=$2; shift 2 ;;
    --tag) TAG=$2; shift 2 ;;
    --port) HTTP_PORT=$2; shift 2 ;;
    --skip-local) SKIP_LOCAL=true; shift ;;
    --clean-images) CLEAN_IMAGES=true; shift ;;
    --help | -h) usage; exit 0 ;;
    *) usage >&2; echo "unknown option: $1" >&2; exit 2 ;;
  esac
done
[ -z "$REGISTRY" ] || [ -n "$TAG" ] || { echo "--registry needs --tag" >&2; exit 2; }

PASSED=0
BUILT_IMAGES=()
WORK="" DEPLOY="" BASE="" ENV_PATH="" COMPOSE_PROJECT_NAME=""

say() { printf '\n== %s\n' "$*"; }
pass() { PASSED=$((PASSED + 1)); echo "ok   $*"; }

fail() {
  echo "FAIL $*" >&2
  if [ -n "$WORK" ] && [ -d "$DEPLOY" ]; then
    echo "---- nginx and api logs (last 50 lines each) ----" >&2
    dc logs --tail=50 nginx api >&2 2>&1 || true
  fi
  echo "$PASSED checks passed before the failure" >&2
  exit 1
}

cleanup() {
  local code=$?
  trap - EXIT
  if [ -n "$WORK" ] && $KEEP; then
    echo
    echo "Kept the stack (project $COMPOSE_PROJECT_NAME) in $WORK"
    echo "Site: $BASE. Remove it with: $WORK/teardown.sh"
  elif [ -n "$WORK" ]; then
    echo
    echo "Cleaning up"
    dc --profile tools down -v --remove-orphans >/dev/null 2>&1 || true
    rm -rf "$WORK"
    if $CLEAN_IMAGES && [ ${#BUILT_IMAGES[@]} -gt 0 ]; then docker rmi "${BUILT_IMAGES[@]}" >/dev/null 2>&1 || true; fi
  fi
  exit "$code"
}
trap cleanup EXIT
trap 'exit 130' INT TERM

for tool in docker curl jq sha256sum; do
  command -v "$tool" >/dev/null 2>&1 || { echo "$tool is required" >&2; exit 2; }
done
docker compose version >/dev/null 2>&1 || { echo "the docker compose plugin is required" >&2; exit 2; }

say "Helper tests"
"$SRC_DEPLOY/tests/storage.test.sh" >/dev/null || { "$SRC_DEPLOY/tests/storage.test.sh"; exit 1; }
pass "storage.test.sh"

free_port() {
  local p _
  for _ in $(seq 1 100); do
    p=$((RANDOM % 20000 + 20000))
    (exec 3<>"/dev/tcp/127.0.0.1/$p") 2>/dev/null || { echo "$p"; return 0; }
  done
  return 1
}

# ---- setup -----------------------------------------------------------------

WORK=$(mktemp -d "${TMPDIR:-/tmp}/veysur-s3test.XXXXXX")
DEPLOY="$WORK/deploy"
mkdir -p "$DEPLOY"
cp -r "$SRC_DEPLOY"/{compose.yaml,nginx.conf,.env.example,caddy,mysql,nginx,scripts,certs,error-pages} "$DEPLOY/" 2>/dev/null ||
  { echo "could not copy the deploy directory" >&2; exit 2; }
rm -f "$DEPLOY/nginx/storage-s3.conf"
cp "$SRC_DEPLOY/tests/compose.s3test.yaml" "$DEPLOY/compose.s3test.yaml"

[ -n "$HTTP_PORT" ] || HTTP_PORT=$(free_port) || { echo "no free port found" >&2; exit 2; }
HTTPS_PORT=$(free_port) || { echo "no free port found" >&2; exit 2; }
BASE="http://localhost:$HTTP_PORT"
ENV_PATH="$DEPLOY/.env"

export COMPOSE_PROJECT_NAME="veysur-s3test-$$"
export VEYSUR_ENV_FILE="$ENV_PATH"
export VEYSUR_COMPOSE_EXTRA="$DEPLOY/compose.s3test.yaml"
export VEYSUR_SKIP_PREFLIGHT=1
export S3TEST_ACCESS_KEY="s3testaccess" S3TEST_SECRET_KEY="s3testsecret$(openssl rand -hex 8 2>/dev/null || echo 0000)"

# Only env_get and env_set are used from common.sh; every compose call goes
# through dc() below so it can never reach the source checkout's stack. It must
# be sourced after VEYSUR_ENV_FILE is set, or env_set would default to the
# source checkout's .env.
# shellcheck source=../scripts/lib/common.sh
source "$SRC_DEPLOY/scripts/lib/common.sh"

cat >"$WORK/teardown.sh" <<TEARDOWN
#!/usr/bin/env bash
export COMPOSE_PROJECT_NAME="$COMPOSE_PROJECT_NAME" S3TEST_ACCESS_KEY="$S3TEST_ACCESS_KEY" S3TEST_SECRET_KEY="$S3TEST_SECRET_KEY"
cd "$DEPLOY" && docker compose --env-file .env -f compose.yaml -f compose.s3test.yaml --profile tools down -v --remove-orphans
rm -rf "$WORK"
TEARDOWN
chmod +x "$WORK/teardown.sh"

dc() { (cd "$DEPLOY" && docker compose --env-file "$ENV_PATH" -f compose.yaml -f compose.s3test.yaml "$@"); }
ops() { local script=$1; shift; (cd "$DEPLOY" && "./scripts/$script" "$@"); }
s3cli() { dc --profile tools run --rm -T --entrypoint aws s3-init --endpoint-url http://s3:9000 "$@"; }

http() {
  local method=$1 url=$2
  shift 2
  STATUS=$(curl -sS -o "$WORK/body" -w '%{http_code}' -X "$method" "$url" "$@") || fail "curl failed: $method $url"
}
api() {
  local method=$1 path=$2
  shift 2
  http "$method" "$BASE/api$path" -H "Authorization: Bearer $TOKEN" -H "X-Project-Id: $PROJECT" -H 'Content-Type: application/json' "$@"
}
expect_status() {
  case "|$1|" in *"|$STATUS|"*) pass "$2 (HTTP $STATUS)" ;; *) fail "$2: expected HTTP $1, got $STATUS: $(head -c 300 "$WORK/body")" ;; esac
}
expect_same() { cmp -s "$1" "$2" && pass "$3" || fail "$3: content differs"; }
expect_success() {
  local desc=$1
  shift
  "$@" >"$WORK/out" 2>&1 && pass "$desc" || { cat "$WORK/out" >&2; fail "$desc"; }
}
expect_failure() {
  local desc=$1 pattern=$2
  shift 2
  if "$@" >"$WORK/out" 2>&1; then cat "$WORK/out" >&2; fail "$desc: expected a failure"; fi
  grep -q -- "$pattern" "$WORK/out" && pass "$desc" || { cat "$WORK/out" >&2; fail "$desc: message did not contain '$pattern'"; }
}

if [ -n "$REGISTRY" ]; then
  IMAGE_REGISTRY=$REGISTRY IMAGE_TAG=$TAG
else
  IMAGE_REGISTRY=veysur-s3test IMAGE_TAG=local
  if $SKIP_BUILD; then
    docker image inspect "$IMAGE_REGISTRY/api:$IMAGE_TAG" "$IMAGE_REGISTRY/nginx:$IMAGE_TAG" >/dev/null 2>&1 ||
      { echo "--skip-build needs $IMAGE_REGISTRY/api:$IMAGE_TAG and nginx:$IMAGE_TAG to exist" >&2; exit 2; }
  else
    say "Building images"
    docker build -q -f "$SRC_DEPLOY/docker/Dockerfile.api" -t "$IMAGE_REGISTRY/api:$IMAGE_TAG" "$REPO_DIR" >/dev/null || fail "api image build"
    docker build -q -f "$SRC_DEPLOY/docker/Dockerfile.nginx" -t "$IMAGE_REGISTRY/nginx:$IMAGE_TAG" --build-arg BUILD_VERSION="$IMAGE_TAG" "$REPO_DIR" >/dev/null || fail "nginx image build"
    BUILT_IMAGES=("$IMAGE_REGISTRY/api:$IMAGE_TAG" "$IMAGE_REGISTRY/nginx:$IMAGE_TAG")
  fi
fi

say "Configuring a throwaway stack in $WORK (project $COMPOSE_PROJECT_NAME, $BASE)"
cp "$DEPLOY/.env.example" "$ENV_PATH"
env_set VEYSUR_IMAGE_REGISTRY "$IMAGE_REGISTRY"
env_set VEYSUR_IMAGE_TAG "$IMAGE_TAG"
env_set VEYSUR_HTTP_PORT "$HTTP_PORT"
env_set VEYSUR_HTTPS_PORT "$HTTPS_PORT"
env_set VEYSUR_TLS_SNIPPET ./caddy/tls-none.caddy
env_set VEYSUR_SITE_ADDRESS :80
env_set API_S3_TYPE s3
env_set API_S3_ENDPOINT http://s3:9000
env_set API_S3_REGION us-east-1
env_set API_S3_PUBLIC_BUCKET test-files
env_set API_S3_PRIVATE_BUCKET test-private
env_set API_S3_ACCESS_KEY_ID "$S3TEST_ACCESS_KEY"
env_set API_S3_SECRET_ACCESS_KEY "$S3TEST_SECRET_KEY"
expect_success "config-generate.sh (S3, non-interactive)" ops config-generate.sh --non-interactive --domain localhost
env_set API_S3_PUBLIC_BASE_URL "$BASE"
[ "$(env_get API_S3_TYPE)" = s3 ] && [ "$(env_get VEYSUR_STORAGE_SNIPPET)" = ./nginx/storage-s3.conf ] ||
  fail "config-generate.sh did not keep S3 storage"

say "Starting the S3 service and the stack"
expect_success "S3 service started" dc up -d s3
expect_success "buckets created" dc --profile tools run --rm -T s3-init
expect_success "deploy.sh" ops deploy.sh

ADMIN_EMAIL="admin@veysur-s3test.example"
ADMIN_PASSWORD="Test-$(openssl rand -hex 8)-Aa1!"
expect_success "admin account created" ops admin-account-bootstrap.sh --email "$ADMIN_EMAIL" --password "$ADMIN_PASSWORD"

login() {
  http POST "$BASE/api/auth-email-password/login" -H 'Content-Type: application/json' \
    -d "$(jq -n --arg e "$ADMIN_EMAIL" --arg p "$ADMIN_PASSWORD" '{email:$e,password:$p}')"
  expect_status 200 "login"
  TOKEN=$(jq -r '.jwt.token' "$WORK/body")
  PROJECT=$(jq -r '(.user.projectOwn[0]._id) // "default"' "$WORK/body")
  [ -n "$TOKEN" ] && [ "$TOKEN" != null ] || fail "login returned no token"
}
login

# ---- helpers for the scenarios --------------------------------------------

random_file() { head -c "$2" /dev/urandom >"$1"; }

# upload FILE NAME MIME [CONTEXT]: sets UP_ID, UP_PATH, UP_URL
upload() {
  local file=$1 name=$2 mime=$3 context=${4:-} hash size payload
  hash=$(sha256sum "$file" | cut -d' ' -f1)
  size=$(stat -c %s "$file")
  payload=$(jq -n --arg f "$name" --arg h "$hash" --argjson s "$size" --arg m "$mime" --arg c "$context" \
    '{filename:$f,fileHash:$h,fileSize:$s,mimeType:$m} + (if $c == "" then {} else {fileContext:$c} end)')
  api POST /file/upload-url -d "$payload"
  expect_status '200|201' "upload-url for '$name'"
  UP_ID=$(jq -r '.fileId' "$WORK/body")
  UP_URL=$(jq -r '.uploadUrl' "$WORK/body")
  UP_PATH=$(jq -r '.file.filePath // .filePath' "$WORK/body")
  [ "$UP_URL" != null ] && [ "$UP_PATH" != null ] || fail "upload-url gave no link or path: $(head -c 300 "$WORK/body")"
  case $UP_URL in "$BASE"/*) pass "upload link is on the site origin" ;; *) fail "upload link is not on the site origin: $UP_URL" ;; esac
  case $UP_URL in *s3:9000*) fail "upload link exposes the internal S3 host: $UP_URL" ;; esac
  http PUT "$UP_URL" -H "Content-Type: $mime" --data-binary @"$file"
  expect_status '200|201|204' "PUT of '$name' through nginx"
  api POST "/file/$UP_ID/confirm"
  expect_status '200|201' "confirm '$name'"
}

# download_url ID: sets DL_URL
download_url() {
  api GET "/file/$1/download-url"
  expect_status 200 "download-url for $1"
  DL_URL=$(jq -r '.downloadUrl' "$WORK/body")
  [ -n "$DL_URL" ] && [ "$DL_URL" != null ] || fail "download-url returned no link"
}

# read_public: fetches the public link for UP_PATH into OUT
read_public() {
  http GET "$BASE/veysur-files/$UP_PATH" -H 'Accept-Encoding: identity'
  cp "$WORK/body" "$1"
}

object_exists() { s3cli s3api head-object --bucket "$1" --key "$2" >/dev/null 2>&1; }

# roundtrip LABEL: upload a public and a private file, read both, delete both
roundtrip() {
  local label=$1 pub="$WORK/pub-$1.png" priv="$WORK/priv-$1.pdf" got="$WORK/got"
  random_file "$pub" 20000
  upload "$pub" "$label.png" image/png
  PUB_ID=$UP_ID PUB_PATH=$UP_PATH
  read_public "$got"
  expect_status 200 "anonymous read of the public file ($label)"
  expect_same "$pub" "$got" "public file bytes match ($label)"

  random_file "$priv" 20000
  upload "$priv" "$label.pdf" application/pdf response
  PRIV_ID=$UP_ID PRIV_PATH=$UP_PATH
  download_url "$PRIV_ID"
  http GET "$DL_URL" -H 'Accept-Encoding: identity'
  expect_status 200 "signed download of the private file ($label)"
  expect_same "$priv" "$WORK/body" "private file bytes match ($label)"

  api DELETE "/file/$PUB_ID"
  expect_status '200|204' "delete the public file ($label)"
  api GET "/file/$PUB_ID/download-url"
  expect_status 404 "deleted file no longer resolves ($label)"
  api DELETE "/file/$PRIV_ID"
  expect_status '200|204' "delete the private file ($label)"
}

# ---- scenarios: S3 ---------------------------------------------------------

say "S3 storage"
expect_success "nginx config test" dc exec -T nginx nginx -t
[ -s "$DEPLOY/nginx/storage-s3.conf" ] && pass "generated nginx include exists" || fail "nginx/storage-s3.conf missing"

png="$WORK/one.png"
random_file "$png" 30000
upload "$png" one.png image/png
ONE_ID=$UP_ID ONE_PATH=$UP_PATH
object_exists test-files "$ONE_PATH" && pass "object is in the public bucket" || fail "object missing from test-files/$ONE_PATH"

read_public "$WORK/got"
expect_status 200 "anonymous read of the public file"
expect_same "$png" "$WORK/got" "public file bytes match"
http GET "$BASE/veysur-files/$ONE_PATH" -H 'Range: bytes=0-9' -H 'Accept-Encoding: identity'
expect_status 206 "range request"
head -c 10 "$png" | cmp -s - "$WORK/body" && pass "range bytes match" || fail "range bytes differ"

priv="$WORK/private.pdf"
random_file "$priv" 30000
upload "$priv" private.pdf application/pdf response
PRIV_ID=$UP_ID PRIV_PATH=$UP_PATH
object_exists test-private "$PRIV_PATH" && pass "response file is in the private bucket" || fail "object missing from test-private/$PRIV_PATH"
download_url "$PRIV_ID"
http GET "$DL_URL" -H 'Accept-Encoding: identity'
expect_status 200 "signed download of the private file"
expect_same "$priv" "$WORK/body" "private file bytes match"

http GET "$BASE/veysur-private/$PRIV_PATH"
expect_status 403 "private file without a signature (/veysur-private/)"
http GET "$BASE/test-private/$PRIV_PATH"
expect_status 403 "private file without a signature (bucket path)"

sig=${DL_URL#*X-Amz-Signature=}
first=${sig:0:1}
swap=0
[ "$first" != 0 ] || swap=1
http GET "${DL_URL/X-Amz-Signature=$first/X-Amz-Signature=$swap}"
expect_status 403 "tampered signature"

http DELETE "$BASE/veysur-files/$ONE_PATH"
expect_status 403 "DELETE through nginx is refused"
http POST "$BASE/veysur-files/$ONE_PATH" -d x
expect_status 403 "POST through nginx is refused"

big="$WORK/big.bin"
random_file "$big" 20971520
upload "$big" big.bin application/octet-stream
read_public "$WORK/got"
expect_status 200 "read back the 20 MB file"
expect_same "$big" "$WORK/got" "20 MB file bytes match"

odd="$WORK/odd.png"
random_file "$odd" 5000
upload "$odd" "my photo+1 & é.png" image/png
read_public "$WORK/got"
expect_status 200 "read a file uploaded with special characters in its name"
expect_same "$odd" "$WORK/got" "special-character file bytes match"

api DELETE "/file/$UP_ID"
expect_status '200|204' "soft delete"
api DELETE "/file/hard/2099-01-01"
expect_status '200|204' "hard delete of soft-deleted files"
object_exists test-files "$UP_PATH" && fail "hard delete left the object in the bucket" || pass "hard delete removed the object"

# ---- backup and restore ----------------------------------------------------

say "Backup and restore in S3 mode"
mkdir -p "$WORK/backups"
expect_success "backup.sh" ops backup.sh --output "$WORK/backups"
grep -q "not in this archive" "$WORK/out" && pass "backup warns that files are not archived" || fail "backup did not warn about the buckets"
archive=$(ls -1t "$WORK/backups"/veysur-backup-*.tar | head -n 1)
tar -tf "$archive" | grep -q 'files.tar.gz' && fail "archive contains files.tar.gz in S3 mode" || pass "archive has no files.tar.gz"
tar -xOf "$archive" --wildcards '*/MANIFEST' | grep -q '^includes=.*\bfiles\b' && fail "MANIFEST lists files" || pass "MANIFEST omits files"

expect_success "restore.sh" ops restore.sh --yes "$archive"
grep -q "S3 buckets" "$WORK/out" && pass "restore says the files stay in S3" || fail "restore did not mention S3"
login
UP_PATH=$ONE_PATH
read_public "$WORK/got"
expect_status 200 "file still readable after restore"
expect_same "$png" "$WORK/got" "file bytes unchanged after restore"
api GET "/file/$PRIV_ID/download-url"
expect_status 200 "file record still present after restore"

# ---- changing buckets ------------------------------------------------------

say "Changing buckets"
env_set API_S3_PUBLIC_BUCKET test-files-2
env_set API_S3_PRIVATE_BUCKET test-private-2
expect_success "deploy.sh with new buckets" ops deploy.sh
grep -q 'test-files-2' "$DEPLOY/nginx/storage-s3.conf" && pass "include regenerated for the new buckets" || fail "include not regenerated"
login
moved="$WORK/moved.png"
random_file "$moved" 8000
upload "$moved" moved.png image/png
object_exists test-files-2 "$UP_PATH" && pass "new upload landed in the new bucket" || fail "object missing from test-files-2/$UP_PATH"
read_public "$WORK/got"
expect_same "$moved" "$WORK/got" "read from the new bucket"

# ---- bad configuration -----------------------------------------------------

say "Rejected configuration"
api_before=$(dc ps -q api)
env_set API_S3_ENDPOINT http://s3:9000/
expect_failure "trailing slash in the endpoint" "API_S3_ENDPOINT must look like" ops deploy.sh
env_set API_S3_ENDPOINT http://s3:9000
env_set API_S3_PUBLIC_BUCKET admin
expect_failure "bucket name that clashes with a site path" "clashes with a site path" ops deploy.sh
env_set API_S3_PUBLIC_BUCKET test-files-2
[ "$(dc ps -q api)" = "$api_before" ] && pass "containers untouched by rejected configs" || fail "the api container changed during a rejected deploy"

# ---- local storage ---------------------------------------------------------

if $SKIP_LOCAL; then
  say "Local storage skipped"
else
  say "Local storage (regression)"
  objects_before=$(s3cli s3 ls s3://test-files-2 --recursive | wc -l)
  env_set API_S3_TYPE local
  expect_failure "local mode refuses leftover S3 bucket names" "fixed veysur-files" ops deploy.sh
  expect_success "config-generate.sh (local)" ops config-generate.sh --non-interactive --domain localhost
  env_set API_S3_PUBLIC_BASE_URL "$BASE"
  [ "$(env_get VEYSUR_STORAGE_SNIPPET)" = ./nginx/storage-local.conf ] && [ "$(env_get API_S3_PUBLIC_BUCKET)" = veysur-files ] ||
    fail "config-generate.sh did not select local storage with the default buckets"
  expect_success "deploy.sh (local)" ops deploy.sh
  login
  roundtrip local
  objects_after=$(s3cli s3 ls s3://test-files-2 --recursive | wc -l)
  [ "$objects_before" = "$objects_after" ] && pass "local mode sent nothing to S3" || fail "S3 object count changed in local mode ($objects_before to $objects_after)"
fi

say "All checks passed ($PASSED)"
