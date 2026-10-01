#!/usr/bin/env bash
# cspell:ignore tmpfile nproc proc meminfo uroot
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

# VEYSUR_DEV=1 layers compose.dev.yaml over the production file. VEYSUR_COMPOSE_EXTRA
# names one more override file (the storage test adds an S3 service this way).
compose() {
  local files=(-f "$DEPLOY_DIR/compose.yaml")
  [ "${VEYSUR_DEV:-0}" != 1 ] || files+=(-f "$DEPLOY_DIR/compose.dev.yaml")
  [ -z "${VEYSUR_COMPOSE_EXTRA:-}" ] || files+=(-f "$VEYSUR_COMPOSE_EXTRA")
  # The nginx include is a bind mount: a missing file would become a directory.
  [ ! -f "$ENV_FILE" ] || storage_snippet_ensure
  docker compose --env-file "$ENV_FILE" "${files[@]}" "$@"
}

# Sets VEYSUR_DEV=1 when the running api container is the dev image, so scripts
# act on the dev stack without being told.
detect_dev() {
  local id
  id=$(docker compose --env-file "$ENV_FILE" -f "$DEPLOY_DIR/compose.yaml" ps -q api 2>/dev/null | head -n 1)
  if [ -n "$id" ] && [ "$(docker inspect -f '{{.Config.Image}}' "$id" 2>/dev/null)" = "veysur/dev:local" ]; then
    export VEYSUR_DEV=1
  fi
}

require_docker() {
  command -v docker >/dev/null 2>&1 || die "docker is not installed. See https://docs.docker.com/engine/install/"
  docker compose version >/dev/null 2>&1 || die "the 'docker compose' plugin (v2.22 or later) is not installed"
  docker info >/dev/null 2>&1 || die "cannot talk to the Docker daemon (is it running, and are you in the docker group?)"
}

# Prints total host RAM in KB; empty output (non-zero return) if undetectable.
detect_ram_kb() {
  [ -r /proc/meminfo ] || return 1
  awk '/^MemTotal:/ {print $2; found=1} END {exit !found}' /proc/meminfo
}

# Refuses to continue below the supported minimum unless VEYSUR_SKIP_PREFLIGHT=1.
preflight() {
  require_docker
  local ram_kb cpus free_gb problems=0

  ram_kb=$(detect_ram_kb || true)
  if [ -n "$ram_kb" ] && [ "$ram_kb" -lt 2900000 ]; then
    warn "RAM is $((ram_kb / 1024)) MB; at least 3 GB is required"
    problems=1
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

# True when something accepts TCP connections on this host's port.
port_in_use() {
  (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null
}

# Warns, without failing, when a host port the stack publishes is already taken.
# Skipped when the stack is already running, since it holds the ports itself.
check_ports() {
  local http https
  [ -z "$(compose ps -q --status running caddy nginx 2>/dev/null)" ] || return 0
  if [ "${VEYSUR_DEV:-0}" = 1 ]; then
    http=${VEYSUR_HTTP_PORT:-$(env_get VEYSUR_HTTP_PORT)}
    http=${http:-8080}
    ! port_in_use "$http" || warn "port $http is already in use; set VEYSUR_HTTP_PORT in $ENV_FILE to a free port"
    return 0
  fi
  http=${VEYSUR_HTTP_PORT:-$(env_get VEYSUR_HTTP_PORT)}
  https=${VEYSUR_HTTPS_PORT:-$(env_get VEYSUR_HTTPS_PORT)}
  http=${http:-80}
  https=${https:-443}
  ! port_in_use "$http" || warn "port $http is already in use; stop what is using it, or set VEYSUR_HTTP_PORT in $ENV_FILE (for example when a reverse proxy sits in front)"
  ! port_in_use "$https" || warn "port $https is already in use; stop what is using it, or set VEYSUR_HTTPS_PORT in $ENV_FILE (for example when a reverse proxy sits in front)"
  return 0
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

  if [ "$(env_get API_S3_TYPE)" = s3 ]; then
    for key in API_S3_ENDPOINT API_S3_REGION API_S3_PUBLIC_BUCKET API_S3_PRIVATE_BUCKET API_S3_ACCESS_KEY_ID API_S3_SECRET_ACCESS_KEY; do
      [ -n "$(env_get "$key")" ] || missing+=("$key")
    done
    [ ${#missing[@]} -eq 0 ] || die "S3 storage is enabled but empty in $ENV_FILE: ${missing[*]}. Run ./scripts/config-generate.sh."
    [ "$(env_get VEYSUR_STORAGE_SNIPPET)" = ./nginx/storage-s3.conf ] ||
      die "API_S3_TYPE=s3 needs VEYSUR_STORAGE_SNIPPET=./nginx/storage-s3.conf in $ENV_FILE. Run ./scripts/config-generate.sh."
    storage_validate "$(env_get API_S3_ENDPOINT)" "$(env_get API_S3_PUBLIC_BUCKET)" "$(env_get API_S3_PRIVATE_BUCKET)"
  fi

  if [ "$(env_get API_S3_TYPE)" != s3 ]; then
    local public private
    public=$(env_get API_S3_PUBLIC_BUCKET) private=$(env_get API_S3_PRIVATE_BUCKET)
    { [ -z "$public" ] || [ "$public" = veysur-files ]; } && { [ -z "$private" ] || [ "$private" = veysur-private ]; } ||
      die "local storage serves fixed veysur-files and veysur-private directories, but $ENV_FILE sets other bucket names. Run ./scripts/config-generate.sh, or set API_S3_TYPE=s3."
  fi

  # Caddy cannot parse its automatic-TLS snippet without a contact e-mail.
  case "$(env_get VEYSUR_TLS_SNIPPET)" in
    "" | *tls-auto*)
      [ -n "$(env_get VEYSUR_ACME_EMAIL)" ] || die "VEYSUR_ACME_EMAIL is empty in $ENV_FILE but automatic TLS needs a contact e-mail."
      ;;
  esac
}

# Dies unless the S3 endpoint and bucket names are usable. The endpoint must be
# a bare origin (scheme, host, optional port): the API swaps it for the site URL
# in signed links, so a path or trailing slash would break every signature.
storage_validate() {
  local endpoint=$1 public=$2 private=$3 bucket
  [[ $endpoint =~ ^https?://[A-Za-z0-9.-]+(:[0-9]+)?$ ]] ||
    die "API_S3_ENDPOINT must look like https://s3.eu-west-2.amazonaws.com (scheme, host, optional port; no path or trailing slash), not '$endpoint'"
  for bucket in "$public" "$private"; do
    [[ $bucket =~ ^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$ ]] ||
      die "'$bucket' is not a valid bucket name (3 to 63 characters: lower-case letters, digits, dots and hyphens)"
    case $bucket in
      api | account | admin | survey | docs | errors | health | static | image | favicon.svg | favicon.png)
        die "bucket name '$bucket' clashes with a site path; choose another" ;;
    esac
  done
  [ "$public" != "$private" ] || die "the public and private buckets must be different"
}

# storage_location PREFIX BUCKET ENDPOINT
# Prints an nginx location that forwards /PREFIX/<key> to BUCKET on the S3
# endpoint, path-style. Signed links are rewritten by the API to the site URL,
# so the request must reach S3 with exactly the Host and path that were signed.
# The key is taken from $request_uri to keep its original percent-encoding.
storage_location() {
  local prefix=$1 bucket=$2 endpoint=$3 scheme host hostname
  scheme=${endpoint%%://*}
  host=${endpoint#*://}
  hostname=${host%%:*}
  cat <<LOCATION
location ^~ /$prefix/ {
    limit_except GET HEAD PUT { deny all; }
    set \$s3_key "";
    if (\$request_uri ~ ^/[^/]+/([^?]*)) { set \$s3_key \$1; }
    set \$s3_upstream "$host";
    proxy_pass $scheme://\$s3_upstream/$bucket/\$s3_key\$is_args\$args;
    proxy_http_version 1.1;
    proxy_set_header Host "$host";
    proxy_set_header Authorization "";
    proxy_set_header Cookie "";
    proxy_set_header Connection "";
    proxy_ssl_server_name on;
    proxy_ssl_name "$hostname";
    proxy_buffering off;
    proxy_request_buffering off;
    proxy_connect_timeout 30s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;
}

LOCATION
}

# storage_snippet_render ENDPOINT PUBLIC_BUCKET PRIVATE_BUCKET: prints the nginx
# include for S3 storage. /veysur-files/ and /veysur-private/ are the fixed
# paths the application puts in file links; the real bucket names carry signed
# uploads and downloads.
storage_snippet_render() {
  local endpoint=$1 public=$2 private=$3
  echo "# Generated by config-generate.sh from .env. Do not edit; changes are overwritten."
  echo "# S3 storage: nginx forwards file links and signed uploads to $endpoint."
  echo
  storage_location veysur-files "$public" "$endpoint"
  [ "$public" = veysur-files ] || storage_location "$public" "$public" "$endpoint"
  storage_location veysur-private "$private" "$endpoint"
  [ "$private" = veysur-private ] || storage_location "$private" "$private" "$endpoint"
}

# Writes deploy/nginx/storage-s3.conf from ENV_FILE when S3 storage is enabled,
# touching the file only when its content changes.
storage_snippet_ensure() {
  [ "$(env_get API_S3_TYPE)" = s3 ] || return 0
  local endpoint public private out="$DEPLOY_DIR/nginx/storage-s3.conf" tmp
  endpoint=$(env_get API_S3_ENDPOINT) public=$(env_get API_S3_PUBLIC_BUCKET) private=$(env_get API_S3_PRIVATE_BUCKET)
  storage_validate "$endpoint" "$public" "$private"
  tmp=$(mktemp)
  storage_snippet_render "$endpoint" "$public" "$private" >"$tmp"
  if [ -f "$out" ] && cmp -s "$tmp" "$out"; then rm -f "$tmp"; else mkdir -p "$DEPLOY_DIR/nginx" && cat "$tmp" >"$out" && rm -f "$tmp"; fi
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

# Databases the application owns: everything except MySQL's own schemas. Dumping
# only these lets a backup restore onto a freshly initialised server without
# overwriting its users and grants.
mysql_app_databases() {
  compose exec -T mysql sh -c 'mysql -N -uroot -p"$MYSQL_ROOT_PASSWORD" -e "SHOW DATABASES"' 2>/dev/null |
    grep -Ev '^(mysql|information_schema|performance_schema|sys)$' || true
}

# Writes a gzipped dump of the application databases to FILE. On failure or an
# implausibly small dump, removes FILE and returns 1.
mysql_dump_to() {
  local file=$1 dbs=()
  mapfile -t dbs < <(mysql_app_databases)
  [ ${#dbs[@]} -gt 0 ] || return 1
  if ! compose exec -T mysql sh -c 'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines --triggers --databases "$@"' sh "${dbs[@]}" | gzip >"$file" \
    || [ "$(gzip -dc "$file" | wc -c)" -lt 1000 ]; then
    rm -f "$file"
    return 1
  fi
}
