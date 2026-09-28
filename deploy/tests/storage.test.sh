#!/usr/bin/env bash
# Checks the S3 storage helpers and that compose.yaml passes every storage key
# through. Run from anywhere: ./deploy/tests/storage.test.sh
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$HERE/../scripts/lib/common.sh"

failures=0
check() {
  local name=$1
  shift
  if "$@" >/dev/null 2>&1; then echo "ok   $name"; else echo "FAIL $name"; failures=$((failures + 1)); fi
}
rejects() { ! (storage_validate "$@") >/dev/null 2>&1; }
contains() { grep -qF -- "$2" <<<"$1"; }

check "accepts an AWS endpoint" storage_validate https://s3.eu-west-2.amazonaws.com acme-files acme-private
check "accepts an endpoint with a port" storage_validate http://minio:9000 acme-files acme-private
check "rejects a trailing slash" rejects https://s3.example.com/ acme-files acme-private
check "rejects an endpoint path" rejects https://s3.example.com/base acme-files acme-private
check "rejects a missing scheme" rejects s3.example.com acme-files acme-private
check "rejects an invalid bucket name" rejects https://s3.example.com Acme_Files acme-private
check "rejects a bucket that clashes with a site path" rejects https://s3.example.com admin acme-private
check "rejects identical buckets" rejects https://s3.example.com same same

aws=$(storage_snippet_render https://s3.eu-west-2.amazonaws.com acme-files acme-private)
check "forwards public links to the public bucket" contains "$aws" 'proxy_pass https://$s3_upstream/acme-files/$s3_key'
check "forwards private links to the private bucket" contains "$aws" 'proxy_pass https://$s3_upstream/acme-private/$s3_key'
check "signs with the endpoint host" contains "$aws" 'proxy_set_header Host "s3.eu-west-2.amazonaws.com";'
check "serves signed uploads on the real bucket name" contains "$aws" 'location ^~ /acme-files/ {'

minio=$(storage_snippet_render http://minio:9000 veysur-files veysur-private)
check "keeps the port in the Host header" contains "$minio" 'proxy_set_header Host "minio:9000";'
check "uses the bare host for SNI" contains "$minio" 'proxy_ssl_name "minio";'
check "does not repeat a location for default bucket names" test "$(grep -c 'location ^~ /veysur-files/ {' <<<"$minio")" = 1

for key in API_S3_TYPE API_S3_ENDPOINT API_S3_REGION API_S3_FORCE_PATH_STYLE API_S3_PUBLIC_BUCKET API_S3_PRIVATE_BUCKET API_S3_ACCESS_KEY_ID API_S3_SECRET_ACCESS_KEY; do
  check "compose.yaml passes $key" grep -qE "^  $key: \\$\\{$key" "$DEPLOY_DIR/compose.yaml"
done
check "compose.yaml mounts the storage include" grep -q 'VEYSUR_STORAGE_SNIPPET' "$DEPLOY_DIR/compose.yaml"

[ "$failures" -eq 0 ] || { echo "$failures failed"; exit 1; }
echo "all passed"
