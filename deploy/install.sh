#!/usr/bin/env bash
# cspell:ignore fsSL
# First-time installer. Checks for Docker (offering to install it if absent),
# loads any bundled image archives, then runs config-generate.sh and deploy.sh.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

ASSUME_YES=false
DOMAIN=""
while [ $# -gt 0 ]; do
  case $1 in
    --yes | -y) ASSUME_YES=true; shift ;;
    --domain) DOMAIN=$2; shift 2 ;;
    --help | -h)
      cat <<USAGE
Usage: ./install.sh [--domain <domain>] [--yes]

  --domain <domain>  Primary domain
  --yes, -y          Non-interactive: install Docker if missing, accept every default
USAGE
      exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 1 ;;
  esac
done

if ! command -v docker >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
  echo "Docker with the Compose plugin is required and was not found."
  if ! $ASSUME_YES; then
    read -r -p "Install it now with Docker's official script? [y/N] " answer || true
    [ "${answer:-}" = y ] || [ "${answer:-}" = Y ] || { echo "Install Docker, then re-run ./install.sh"; exit 1; }
  fi
  command -v curl >/dev/null 2>&1 || { echo "curl is required to install Docker" >&2; exit 1; }
  curl -fsSL https://get.docker.com | sh
  if [ "$(id -u)" -ne 0 ] && ! docker info >/dev/null 2>&1; then
    echo "Docker is installed. Add your user to the docker group and log in again, or run this script with sudo."
    exit 1
  fi
fi

if [ -d images ]; then
  echo "Loading bundled images"
  for archive in images/*.tar; do
    [ -e "$archive" ] || continue
    docker load -i "$archive" >/dev/null
  done
fi

config_args=()
[ -z "$DOMAIN" ] || config_args+=(--domain "$DOMAIN")
$ASSUME_YES && config_args+=(--non-interactive)

if [ ! -f .env ]; then
  ./scripts/config-generate.sh "${config_args[@]}"
fi
./scripts/deploy.sh
