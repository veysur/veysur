#!/usr/bin/env bash
# cspell:ignore genpkey pkeyopt aes256 pubout passin
# Interactive configuration. Writes deploy/.env and never touches running containers.
# Re-run it to edit settings: existing values become the defaults, and a diff is
# shown before anything is overwritten.
set -euo pipefail
# shellcheck source=lib/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

ASSUME_YES=false
NON_INTERACTIVE=false
DOMAIN_ARG=""
DEV_MODE=false

usage() {
  cat <<USAGE
Usage: $0 [--domain <domain>] [--yes] [--non-interactive]

  --domain <domain>   Primary domain (skips that prompt)
  --yes, -y           Write without asking for confirmation
  --non-interactive   Accept every default; generate every empty secret
  --dev               Local development settings (localhost, plain HTTP on 8080,
                      generated secrets); implies --non-interactive
  --help, -h          Show this help

Environment: VEYSUR_HTTP_PORT and VEYSUR_HTTPS_PORT override the published host ports.
Writes: $ENV_FILE
USAGE
}

while [ $# -gt 0 ]; do
  case $1 in
    --domain) DOMAIN_ARG=$2; shift 2 ;;
    --yes | -y) ASSUME_YES=true; shift ;;
    --non-interactive) NON_INTERACTIVE=true; ASSUME_YES=true; shift ;;
    --dev) DEV_MODE=true; NON_INTERACTIVE=true; ASSUME_YES=true; DOMAIN_ARG=localhost; shift ;;
    --help | -h) usage; exit 0 ;;
    *) usage >&2; die "unknown option: $1" ;;
  esac
done

preflight
command -v openssl >/dev/null 2>&1 || die "openssl is required to generate keys"

WORK=$(mktemp)
trap 'rm -f "$WORK"' EXIT
if [ -f "$ENV_FILE" ]; then cp "$ENV_FILE" "$WORK"; else cp "$ENV_EXAMPLE" "$WORK"; fi

# current KEY: value in the file being edited
current() { sed -n "s/^$1=//p" "$WORK" | tail -n 1; }

# ask KEY "Prompt" "fallback default"
ask() {
  local key=$1 prompt=$2 fallback=${3:-} default answer
  default=$(current "$key")
  default=${default:-$fallback}
  if $NON_INTERACTIVE; then
    answer=$default
  else
    read -r -p "$prompt [${default}]: " answer || true
    answer=${answer:-$default}
  fi
  env_set "$key" "$answer" "$WORK"
}

# read_secret "Prompt": prints what was typed (not echoed); empty when non-interactive
read_secret() {
  local answer=""
  if ! $NON_INTERACTIVE; then
    read -r -s -p "$1: " answer || true
    echo >&2
  fi
  printf '%s' "$answer"
}

# ask_secret KEY "Prompt" [bytes]: keep the current value or generate one
ask_secret() {
  local key=$1 prompt=$2 bytes=${3:-24} existing answer
  existing=$(current "$key")
  if [ -n "$existing" ]; then
    answer=$(read_secret "$prompt (Enter keeps the current value)")
    [ -z "$answer" ] || env_set "$key" "$answer" "$WORK"
  else
    answer=$(read_secret "$prompt (Enter generates one)")
    env_set "$key" "${answer:-$(random_hex "$bytes")}" "$WORK"
  fi
}

echo "${BLUE}VeySur configuration${NC}"
echo

# --- domain and TLS -------------------------------------------------------
[ -z "$DOMAIN_ARG" ] || env_set API_WEB_DOMAIN "$DOMAIN_ARG" "$WORK"
# Host ports can be overridden from the environment, for example when 80 is taken.
[ -z "${VEYSUR_HTTP_PORT:-}" ] || env_set VEYSUR_HTTP_PORT "$VEYSUR_HTTP_PORT" "$WORK"
[ -z "${VEYSUR_HTTPS_PORT:-}" ] || env_set VEYSUR_HTTPS_PORT "$VEYSUR_HTTPS_PORT" "$WORK"
ask API_WEB_DOMAIN "Primary domain (no scheme)" "veysur.example.com"
domain=$(current API_WEB_DOMAIN)
env_set API_DOMAIN "$domain" "$WORK"
env_set API_CORS_ALLOWED_DOMAINS "$domain" "$WORK"

if ! getent hosts "$domain" >/dev/null 2>&1; then
  warn "$domain does not resolve yet. Let's Encrypt needs it to point at this host."
fi

echo
echo "TLS mode:"
echo "  1) Let's Encrypt, automatic (public domain, ports 80 and 443 open)"
echo "  2) My own certificate (place tls.crt and tls.key in deploy/certs/)"
echo "  3) Local test certificate (browsers will warn)"
echo "  4) None, a load balancer in front terminates TLS"
case "$(current VEYSUR_TLS_SNIPPET)" in
  *custom*) tls_default=2 ;; *internal*) tls_default=3 ;; *none*) tls_default=4 ;; *) tls_default=1 ;;
esac
if $NON_INTERACTIVE; then tls_choice=$tls_default; else
  read -r -p "Choose [${tls_default}]: " tls_choice || true
  tls_choice=${tls_choice:-$tls_default}
fi
case $tls_choice in
  1) env_set VEYSUR_TLS_SNIPPET ./caddy/tls-auto.caddy "$WORK"; env_set VEYSUR_SITE_ADDRESS "" "$WORK"
     ask VEYSUR_ACME_EMAIL "Contact e-mail for Let's Encrypt" "$(current VEYSUR_ADMIN_EMAIL || true)"
     [ -n "$(current VEYSUR_ACME_EMAIL)" ] || env_set VEYSUR_ACME_EMAIL "admin@$domain" "$WORK" ;;
  2) env_set VEYSUR_TLS_SNIPPET ./caddy/tls-custom.caddy "$WORK"; env_set VEYSUR_SITE_ADDRESS "" "$WORK" ;;
  3) env_set VEYSUR_TLS_SNIPPET ./caddy/tls-internal.caddy "$WORK"; env_set VEYSUR_SITE_ADDRESS "" "$WORK" ;;
  4) env_set VEYSUR_TLS_SNIPPET ./caddy/tls-none.caddy "$WORK"; env_set VEYSUR_SITE_ADDRESS ":80" "$WORK" ;;
  *) die "choose 1, 2, 3 or 4" ;;
esac
port=$(current VEYSUR_HTTPS_PORT)
if [ "${port:-443}" != 443 ] && [ "$tls_choice" != 4 ]; then
  env_set API_S3_PUBLIC_BASE_URL "https://$domain:$port" "$WORK"
else
  env_set API_S3_PUBLIC_BASE_URL "https://$domain" "$WORK"
fi

if $DEV_MODE; then
  env_set VEYSUR_TLS_SNIPPET ./caddy/tls-none.caddy "$WORK"
  env_set VEYSUR_SITE_ADDRESS ":80" "$WORK"
  env_set VEYSUR_HTTP_PORT 8080 "$WORK"
  env_set API_S3_PUBLIC_BASE_URL "http://localhost:8080" "$WORK"
  env_set API_MAIL_HOST fake-smtp "$WORK"
  env_set API_MAIL_PORT 1025 "$WORK"
fi

# --- administrator and mail ----------------------------------------------
echo
ask VEYSUR_ADMIN_EMAIL "Administrator e-mail (used by the first-account bootstrap)" "admin@$domain"
ask API_MAIL_HOST "SMTP host (blank to configure later)" ""
if [ -n "$(current API_MAIL_HOST)" ]; then
  ask API_MAIL_PORT "SMTP port" "587"
  # 465 is implicit TLS; 587 and 25 start plain and upgrade with STARTTLS.
  case "$(current API_MAIL_PORT)" in
    465) env_set API_MAIL_SECURE true "$WORK" ;;
    587 | 25) env_set API_MAIL_SECURE false "$WORK" ;;
  esac
  ask API_MAIL_AUTH_USER "SMTP username" ""
  ask API_MAIL_ADDRESS_FROM "Sender address (your relay must allow it)" "no-reply@$domain"
  smtp_password=$(read_secret "SMTP password (Enter keeps the current value)")
  [ -z "$smtp_password" ] || env_set API_MAIL_AUTH_PASS "$smtp_password" "$WORK"
  if ! timeout 5 bash -c "</dev/tcp/$(current API_MAIL_HOST)/$(current API_MAIL_PORT)" 2>/dev/null; then
    warn "cannot connect to $(current API_MAIL_HOST):$(current API_MAIL_PORT) from this host"
  fi
else
  warn "no SMTP host set: invitations and password resets cannot be sent until you set one"
fi

# --- secrets ---------------------------------------------------------------
echo
ask_secret API_JWT_KEY "JWT signing key" 64
ask_secret MYSQL_ROOT_PASSWORD "MySQL root password" 24
ask_secret MYSQL_PASSWORD "MySQL application password" 24
ask_secret REDIS_PASSWORD "Redis password" 24
ask_secret API_S3_LOCAL_SECRET "File-storage signing secret" 32

if [ -z "$(current API_ENCRYPTION_PRIVATE_KEY)" ]; then
  info "Generating the field-encryption key pair (a few seconds)"
  key_password=$(random_hex 24)
  private_pem=$(openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:4096 -aes256 -pass pass:"$key_password" 2>/dev/null)
  public_pem=$(printf '%s\n' "$private_pem" | openssl rsa -pubout -passin pass:"$key_password" 2>/dev/null)
  env_set API_ENCRYPTION_PRIVATE_KEY "$(printf '%s\n' "$private_pem" | base64 -w 0)" "$WORK"
  env_set API_ENCRYPTION_PUBLIC_KEY "$(printf '%s\n' "$public_pem" | base64 -w 0)" "$WORK"
  env_set API_ENCRYPTION_PRIVATE_KEY_PASSWORD "$key_password" "$WORK"
fi

# --- review and write -----------------------------------------------------
echo
if [ -f "$ENV_FILE" ]; then
  if diff -q <(mask_secrets <"$ENV_FILE") <(mask_secrets <"$WORK") >/dev/null; then
    ok "No changes to $ENV_FILE"
    exit 0
  fi
  echo "Changes to $ENV_FILE (secret values hidden):"
  diff -u <(mask_secrets <"$ENV_FILE") <(mask_secrets <"$WORK") | tail -n +3 || true
else
  echo "This will create $ENV_FILE."
fi
if ! $ASSUME_YES; then
  read -r -p "Write it? [y/N] " confirm || true
  [ "${confirm:-}" = y ] || [ "${confirm:-}" = Y ] || die "not written"
fi
umask 077
cat "$WORK" >"$ENV_FILE"
chmod 600 "$ENV_FILE"
ok "Wrote $ENV_FILE"
if $DEV_MODE; then
  echo "Next: pnpm dev:migrate && pnpm dev   (from the repository root)"
else
  echo "Next: ./scripts/deploy.sh"
fi
