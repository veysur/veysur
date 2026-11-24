#!/usr/bin/env bash
# cspell:ignore healthchecks
# Helpers shared by release-smoke.sh and release-upgrade.sh. Source, do not execute.
# The caller sets KEEP, and PKG, WORK, BASE and COMPOSE_PROJECT_NAME as it builds the stack.

KEEP=${KEEP:-false}
PASSED=0
WORK="" PKG="" BASE="" COMPOSE_PROJECT_NAME=""

say() { printf '\n== %s\n' "$*"; }
pass() { PASSED=$((PASSED + 1)); echo "ok   $*"; }

dc() { (cd "$PKG" && docker compose --env-file "$PKG/.env" -f compose.yaml "$@"); }
ops() { local script=$1; shift; (cd "$PKG" && "./$script" "$@"); }

fail() {
  echo "FAIL $*" >&2
  if [ -n "$PKG" ] && [ -f "$PKG/.env" ]; then
    echo "---- container state ----" >&2
    dc ps -a >&2 2>&1 || true
    echo "---- logs (last 100 lines per service) ----" >&2
    dc logs --tail=100 >&2 2>&1 || true
  fi
  echo "$PASSED checks passed before the failure" >&2
  exit 1
}

cleanup() {
  local code=$?
  trap - EXIT
  if [ -n "$WORK" ] && $KEEP; then
    echo
    echo "Kept the stack (project $COMPOSE_PROJECT_NAME) in $PKG"
    echo "Site: $BASE. Remove it with: (cd $PKG && docker compose down -v --remove-orphans) && rm -rf $WORK"
  elif [ -n "$WORK" ]; then
    echo
    echo "Cleaning up"
    [ ! -f "$PKG/.env" ] || dc --profile tools down -v --remove-orphans >/dev/null 2>&1 || true
    rm -rf "$WORK"
  fi
  exit "$code"
}

free_port() {
  local p _
  for _ in $(seq 1 100); do
    p=$((RANDOM % 20000 + 20000))
    (exec 3<>"/dev/tcp/127.0.0.1/$p") 2>/dev/null || { echo "$p"; return 0; }
  done
  return 1
}

# retry ATTEMPTS DELAY DESCRIPTION CMD...: runs CMD until it succeeds, else fails the run.
retry() {
  local attempts=$1 delay=$2 desc=$3 i
  shift 3
  for ((i = 1; i <= attempts; i++)); do
    if "$@" >/dev/null 2>&1; then pass "$desc"; return 0; fi
    sleep "$delay"
  done
  fail "$desc (no success after $attempts attempts)"
}

http() {
  local method=$1 url=$2
  shift 2
  STATUS=$(curl -sS -m 30 -o "$WORK/body" -w '%{http_code}' -X "$method" "$url" "$@") || fail "curl failed: $method $url"
}
expect_status() {
  case "|$1|" in *"|$STATUS|"*) pass "$2 (HTTP $STATUS)" ;; *) fail "$2: expected HTTP $1, got $STATUS: $(head -c 300 "$WORK/body")" ;; esac
}
expect_success() {
  local desc=$1
  shift
  "$@" >"$WORK/out" 2>&1 && pass "$desc" || { cat "$WORK/out" >&2; fail "$desc"; }
}

# The account forms need a proof of work. The api container's Node solves it, so the host needs
# nothing beyond Docker. Sets BOT_TOKEN; each token is single use.
solve_bot_check() {
  local challenge bits min_seconds
  http POST "$BASE/api/bot-protection/challenge" -H 'Content-Type: application/json' -d '{}'
  expect_status '200|201' "account bot-check challenge"
  [ "$(jq -r '.enabled' "$WORK/body")" = true ] || { BOT_TOKEN=""; return 0; }
  challenge=$(jq -r '.challenge' "$WORK/body") bits=$(jq -r '.bits' "$WORK/body") min_seconds=$(jq -r '.minSeconds' "$WORK/body")
  BOT_TOKEN=$(dc exec -T -e CHALLENGE="$challenge" -e BITS="$bits" api node -e '
const { createHash } = require("crypto")
const { CHALLENGE: challenge, BITS: bits } = process.env
const zeroBits = (d, n) => {
  for (let i = 0; i < Math.floor(n / 8); i++) if (d[i] !== 0) return false
  return n % 8 === 0 || d[Math.floor(n / 8)] >> (8 - (n % 8)) === 0
}
let nonce = 0
while (!zeroBits(createHash("sha256").update(`${challenge}:${nonce}`).digest(), Number(bits))) nonce++
process.stdout.write(`${challenge}:${nonce}`)
') || fail "could not solve the bot-check challenge"
  [ -n "$BOT_TOKEN" ] || fail "the bot-check solution was empty"
  sleep "$min_seconds"
  pass "bot-check solved"
}

login() {
  http POST "$BASE/api/auth-email-password/login" -H 'Content-Type: application/json' \
    -d "$(jq -n --arg e "$ADMIN_EMAIL" --arg p "$1" --arg t "$BOT_TOKEN" '{email:$e,password:$p,botCheck:{token:$t}}')"
}

admin_login() {
  solve_bot_check
  login "$ADMIN_PASSWORD"
  expect_status 200 "admin login"
  TOKEN=$(jq -r '.jwt.token' "$WORK/body")
  PROJECT=$(jq -r '(.user.projectOwn[0]._id) // "default"' "$WORK/body")
  [ -n "$TOKEN" ] && [ "$TOKEN" != null ] && pass "login returned a JWT" || fail "login returned no token: $(head -c 300 "$WORK/body")"
}

ping_ok() { [ "$(curl -s -m 10 -o /dev/null -w '%{http_code}' "$BASE/api/ping")" = 200 ]; }
