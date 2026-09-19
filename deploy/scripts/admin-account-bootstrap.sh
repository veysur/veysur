#!/usr/bin/env bash
# cspell:ignore userid
# Creates the first administrator account and sets it as owner of the single
# project (API_PROJECT_OWNER_ID), then recreates the containers that read it.
set -euo pipefail
# shellcheck source=lib/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

EMAIL="" PASSWORD="" NAME_FIRST="" NAME_LAST="" DRY_RUN=false

while [ $# -gt 0 ]; do
  case $1 in
    --email) EMAIL=$2; shift 2 ;;
    --password) PASSWORD=$2; shift 2 ;;
    --name-first) NAME_FIRST=$2; shift 2 ;;
    --name-last) NAME_LAST=$2; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    --help | -h)
      cat <<USAGE
Usage: $0 --email <email> [--password <pw>] [--name-first <n>] [--name-last <n>] [--dry-run]

Creates the first administrator and wires it up as the project owner.
The password is generated and printed once if not given.
USAGE
      exit 0 ;;
    *) die "unknown option: $1" ;;
  esac
done

[ -n "$EMAIL" ] || die "--email is required"
require_docker
require_env_file

json_escape() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'; }
options="{\"email\":\"$(json_escape "$EMAIL")\""
[ -z "$PASSWORD" ] || options+=",\"password\":\"$(json_escape "$PASSWORD")\""
[ -z "$NAME_FIRST" ] || options+=",\"nameFirst\":\"$(json_escape "$NAME_FIRST")\""
[ -z "$NAME_LAST" ] || options+=",\"nameLast\":\"$(json_escape "$NAME_LAST")\""
options+="}"

if $DRY_RUN; then
  echo "[dry-run] would run user.createAccount with: ${options//$PASSWORD/********}"
  echo "[dry-run] would set API_PROJECT_OWNER_ID in $ENV_FILE and recreate api and task-manager"
  exit 0
fi

info "Creating account"
output=$(compose exec -T -e API_TASK=user -e API_ACTION=createAccount -e API_TASK_JSON="$options" api node dist/run.js 2>&1) || {
  echo "$output"
  die "account creation failed"
}
echo "$output"

result=$(printf '%s\n' "$output" | sed -n 's/^\[Task\] Completed user\.createAccount: //p')
[ -n "$result" ] || die "could not find the createAccount result in the output above"
field() { printf '%s' "$result" | sed -n "s/.*\"$1\":\"\\([^\"]*\\)\".*/\\1/p"; }
user_id=$(field userId)
generated_password=$(field password)
[ -n "$user_id" ] || die "createAccount returned no userId: $result"

env_set API_PROJECT_OWNER_ID "$user_id"
info "Recreating api and task-manager to pick up the project owner"
compose up -d --wait api task-manager

ok "Administrator created"
echo "  Email:    $(field email)"
echo "  User id:  $user_id"
if [ -n "$generated_password" ]; then
  echo "  Password: $generated_password (generated, shown once)"
fi
