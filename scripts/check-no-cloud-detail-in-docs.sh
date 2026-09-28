#!/usr/bin/env bash
# Guard against cloud implementation detail creeping into this public repo's prose.
#
# check-no-billing-logic.sh scans source, config and tests but skips `*.md`/`*.mdx`, since prose
# may describe extensions in general terms. This guard covers that gap: documentation
# and agent guidance may say "an extension can supply this through a composition seam", but must not
# name the extension's internal services, sub-apps, endpoints or dev tooling. Those belong in the
# private repo's docs.
set -euo pipefail

cd "$(dirname "$0")/.."

PATTERN='platform/geo|appPlatform|appAccount/billing|ServicePayment|ServiceGeo|debug-mint-token|API_COMPOSITION_MODULE|BLOCKED_COUNTRIES|payment-project'

if git grep -nIiE "$PATTERN" -- '*.md' '*.mdx' ':(exclude)external/**'; then
  echo
  echo "ERROR: cloud implementation detail found in public documentation (see above)."
  echo "Describe extensions generically and keep the specifics in the private repo."
  exit 1
fi

echo "cloud-detail-in-docs guard: clean"
