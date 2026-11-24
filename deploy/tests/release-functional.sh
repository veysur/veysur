#!/usr/bin/env bash
# cspell:ignore vsst sha256sum priv urandom
# Functional journey for release-smoke.sh, sourced after the smoke checks pass. It uses the helpers
# and variables defined there (http, expect_status, pass, fail, dc, ops, admin_login, BASE, WORK,
# TOKEN, PROJECT) and leaves the stack running.

# api METHOD PATH [curl args]: an authenticated call to the admin API, sets STATUS and $WORK/body.
api() {
  local method=$1 path=$2
  shift 2
  http "$method" "$BASE/api$path" -H "Authorization: Bearer $TOKEN" -H "X-Project-Id: $PROJECT" -H 'Content-Type: application/json' "$@"
}

# survey_journey: create, publish, answer and read back a survey. Sets SURVEY_ID, QUESTION_CODE.
survey_journey() {
  local patches
  api POST /survey -d '{"survey":{"name":"Release test survey","title":{"en":"Release test survey"}}}'
  expect_status '200|201' "survey created"
  SURVEY_ID=$(jq -r '.survey._id // ._id' "$WORK/body")
  [ -n "$SURVEY_ID" ] && [ "$SURVEY_ID" != null ] || fail "survey create returned no id: $(head -c 300 "$WORK/body")"

  api GET "/survey/$SURVEY_ID"
  expect_status 200 "survey read"
  patches=$(dc exec -T api node -e "$(cat "$(dirname "${BASH_SOURCE[0]}")/release-functional-patches.js")" <"$WORK/body") ||
    fail "could not build the survey patches in the api container"
  QUESTION_CODE=$(jq -r '.questionCode' <<<"$patches")
  [ -n "$QUESTION_CODE" ] && [ "$QUESTION_CODE" != null ] || fail "the patch helper returned no question code"

  api PATCH "/survey/$SURVEY_ID" -d "$(jq -c '{patches}' <<<"$patches")"
  expect_status '200|201|204' "question added and survey opened"

  # Releases before the survey settings were created at startup fail to publish a fresh project
  # until the admin app's read creates them. The upgrade test seeds such a release.
  if [ "${SEED_LEGACY_SETTINGS:-0}" = 1 ]; then
    api GET /setting-survey
    expect_status 200 "project survey settings loaded"
  fi

  api POST "/survey-publication/$SURVEY_ID/publish" -d '{}'
  expect_status '200|201' "survey published"

  http POST "$BASE/api/auth-participant/$SURVEY_ID" -H "X-Project-Id: $PROJECT" -H 'Content-Type: application/json' -d '{}'
  expect_status '200|201' "participant session"

  api GET "/survey-publication/$SURVEY_ID/published"
  expect_status 200 "published survey read"
  local snapshot_id publication_id
  snapshot_id=$(jq -r '(.publication // .).snapshotId' "$WORK/body")
  publication_id=$(jq -r '(.publication // .)._id' "$WORK/body")
  [ "$snapshot_id" != null ] && [ "$publication_id" != null ] || fail "published survey has no snapshot or publication id"

  api POST "/survey-response/$SURVEY_ID/$snapshot_id" -d "$(jq -n --arg p "$publication_id" --arg c "$QUESTION_CODE" \
    '{publicationId:$p,response:{answers:{($c):"release-test-answer"},completed:true,completedAt:(now|todate)}}')"
  expect_status '200|201' "response submitted"

  api GET "/survey-response/$SURVEY_ID?perPage=50"
  expect_status 200 "responses listed"
  jq -e --arg c "$QUESTION_CODE" '[(.response // .responses)[]? | select(.answers[$c] == "release-test-answer")] | length == 1' "$WORK/body" >/dev/null &&
    pass "the stored response carries the submitted answer" || fail "response not found with its answer: $(head -c 400 "$WORK/body")"
}

# survey_export: exports the survey archive and downloads it through the site origin.
survey_export() {
  api POST "/import-export/export/survey/$SURVEY_ID/vsst"
  expect_status '200|201' "survey export requested"
  local url
  url=$(jq -r '.downloadUrl' "$WORK/body")
  [ -n "$url" ] && [ "$url" != null ] || fail "export returned no download link: $(head -c 300 "$WORK/body")"
  case $url in "$BASE"/*) pass "export link is on the site origin" ;; *) fail "export link is not on the site origin: $url" ;; esac
  http GET "$url" -H 'Accept-Encoding: identity'
  expect_status 200 "export download"
  [ "$(stat -c %s "$WORK/body")" -gt 100 ] && pass "export archive is not empty" || fail "export archive is empty"
}

# file_roundtrip: uploads a public and a private file through local storage and reads both back.
file_roundtrip() {
  local pub="$WORK/pub.png" priv="$WORK/priv.pdf" hash size
  head -c 20000 /dev/urandom >"$pub"
  head -c 20000 /dev/urandom >"$priv"

  upload_file() {
    local file=$1 name=$2 mime=$3 context=${4:-}
    hash=$(sha256sum "$file" | cut -d' ' -f1)
    size=$(stat -c %s "$file")
    api POST /file/upload-url -d "$(jq -n --arg f "$name" --arg h "$hash" --argjson s "$size" --arg m "$mime" --arg c "$context" \
      '{filename:$f,fileHash:$h,fileSize:$s,mimeType:$m} + (if $c == "" then {} else {fileContext:$c} end)')"
    expect_status '200|201' "upload link for $name"
    UP_ID=$(jq -r '.fileId' "$WORK/body")
    UP_URL=$(jq -r '.uploadUrl' "$WORK/body")
    UP_PATH=$(jq -r '.file.filePath // .filePath' "$WORK/body")
    case $UP_URL in "$BASE"/*) ;; *) fail "upload link is not on the site origin: $UP_URL" ;; esac
    http PUT "$UP_URL" -H "Content-Type: $mime" --data-binary @"$file"
    expect_status '200|201|204' "upload of $name"
    api POST "/file/$UP_ID/confirm"
    expect_status '200|201' "confirm $name"
  }

  upload_file "$pub" release.png image/png
  http GET "$BASE/veysur-files/$UP_PATH" -H 'Accept-Encoding: identity'
  expect_status 200 "public file read"
  cmp -s "$pub" "$WORK/body" && pass "public file bytes match" || fail "public file bytes differ"
  local pub_id=$UP_ID

  upload_file "$priv" release.pdf application/pdf response
  local priv_id=$UP_ID
  api GET "/file/$priv_id/download-url"
  expect_status 200 "signed download link"
  http GET "$(jq -r '.downloadUrl' "$WORK/body")" -H 'Accept-Encoding: identity'
  expect_status 200 "private file download"
  cmp -s "$priv" "$WORK/body" && pass "private file bytes match" || fail "private file bytes differ"

  api DELETE "/file/$pub_id"
  expect_status '200|204' "public file deleted"
  api DELETE "/file/$priv_id"
  expect_status '200|204' "private file deleted"
}

# backup_roundtrip: backs the stack up, restores it, and checks the survey and answer survived.
backup_roundtrip() {
  mkdir -p "$WORK/backups"
  expect_success "backup.sh" ops scripts/backup.sh --output "$WORK/backups"
  local archive
  archive=$(ls -1t "$WORK"/backups/veysur-backup-*.tar | head -n 1)
  [ -n "$archive" ] && pass "backup archive written" || fail "no backup archive found"
  expect_success "restore.sh" ops scripts/restore.sh --yes "$archive"
  retry 30 2 "/api/ping returns 200 after restore" ping_ok
  admin_login
  api GET "/survey-response/$SURVEY_ID?perPage=50"
  expect_status 200 "responses listed after restore"
  jq -e --arg c "$QUESTION_CODE" '[(.response // .responses)[]? | select(.answers[$c] == "release-test-answer")] | length == 1' "$WORK/body" >/dev/null &&
    pass "the response survived the restore" || fail "response missing after restore: $(head -c 400 "$WORK/body")"
}

functional_checks() {
  say "Functional journey"
  survey_journey
  survey_export
  file_roundtrip
  backup_roundtrip
}
