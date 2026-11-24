#!/usr/bin/env bash
# Browser journey for release-smoke.sh, sourced after the functional journey. Runs the Playwright
# specs in browser/ against the stack, then checks the participant's answer reached the API.

browser_checks() {
  say "Browser journey"
  local dir
  dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/browser" && pwd)"
  expect_success "npm ci" bash -c "cd '$dir' && npm ci --no-audit --no-fund"
  if ! (cd "$dir" && BASE_URL="$BASE" ADMIN_EMAIL="$ADMIN_EMAIL" ADMIN_PASSWORD="$ADMIN_PASSWORD" SURVEY_ID="$SURVEY_ID" npx playwright test); then
    fail "the browser specs failed (traces and screenshots are in $dir/test-results)"
  fi
  pass "browser specs"

  admin_login
  api GET "/survey-response/$SURVEY_ID?perPage=50"
  expect_status 200 "responses listed after the browser journey"
  jq -e '(.response // .responses | length) == 2' "$WORK/body" >/dev/null &&
    pass "the browser participant's response was stored" || fail "expected 2 responses after the browser journey: $(head -c 400 "$WORK/body")"
}
