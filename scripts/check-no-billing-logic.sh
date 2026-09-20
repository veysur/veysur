#!/usr/bin/env bash
# Guard against billing logic creeping back into this public, self-hostable core.
#
# Billing, payment, tax and invoice code belongs to the commercial overlay
# packages (veysur-api-cloud, veysur-app-cloud, veysur-common-cloud), reached
# only through the composition seams. Core carries none of it: no Stripe, no
# invoices or credit notes, no VAT or tax ids, no billing addresses, no
# payment methods, no subscription plans.
#
# Scope: source, config, tests and data. Prose documentation (`*.md`, `*.mdx`)
# is not scanned, since it may describe the overlay in general terms.
#
# Excluded on purpose:
#   - the eslint configs, which name the overlay's directories in their
#     import-boundary rules
#   - the rsbuild configs, which inline the public Stripe key the overlay's
#     checkout page reads (`APP_STRIPE_PUBLISH_KEY`). A build-time variable,
#     not logic; renaming it also means renaming it in the overlay's image
#     builds and secrets, so it is a follow-up rather than an oversight.
set -euo pipefail

cd "$(dirname "$0")/.."

PATTERN='stripe|invoice|\bvies\b|vat ?number|billing ?address|billingAddress|\btaxId\b|credit ?note|payment ?method|subscription ?plan|billing ?period|\bpricing\b'

EXCLUDES=(
  ':(exclude)pnpm-lock.yaml'
  ':(exclude)external/**'
  ':(exclude)**/*.md'
  ':(exclude)**/*.mdx'
  ':(exclude)scripts/check-no-billing-logic.sh'
  ':(exclude)package/*/eslint.config.mjs'
  ':(exclude)package/app/rsbuild.config.ts'
  ':(exclude)package/app/rsbuild.account.config.ts'
)

if git grep -nIiE "$PATTERN" -- . "${EXCLUDES[@]}"; then
  echo
  echo "ERROR: billing vocabulary found in the self-hostable core (see above)."
  echo "Billing logic belongs in the commercial overlay packages, not in core."
  echo "If a match is a false positive, reword it; if it is a deliberate exception,"
  echo "add it to EXCLUDES in scripts/check-no-billing-logic.sh with the reason."
  exit 1
fi

echo "billing-logic guard: clean"
