# AGENTS.md — veysur-common

Shared TypeScript library used by both `package/api` and `package/app`. Dual-output build: CommonJS (for Node.js) and ESM (for bundlers).

## Build & Test Commands

```bash
pnpm build:common                              # build from repo root (required after any change)
pnpm test:common                               # run tests from repo root
pnpm --filter veysur-common build              # build from any directory
pnpm --filter veysur-common test               # test from any directory
pnpm --filter veysur-common typecheck          # type-check
```

**After editing common**, always run `pnpm build:common` before running or testing dependent packages — `app` and `api` consume the compiled output in `dist/`, not source.

## Output & Exports

Build outputs `dist/cjs/` and `dist/esm/` atomically (swap pattern to avoid corruption mid-build).

Three subpath export entry points:

| Import | Content |
|--------|---------|
| `veysur-common` | Main index: models, utilities, subscription types, Logger, Money |
| `veysur-common/model/constructor` | Constructor types only |
| `veysur-common/model/schema` | Validation schemas only |

## Important Caveats

**`util/generateSurveyHash` is server-only** — it uses Node.js `crypto` and is intentionally excluded from the main export. Import it directly:
```ts
import { generateSurveyHash } from 'veysur-common/util/generateSurveyHash'
```
Never import this from frontend (`package/app` or `package/website`).

**TypeScript strict mode is off** — `strict: false`, `noImplicitAny: false`. This is intentional for cross-project compatibility. Do not tighten without coordinating changes across `api` and `app`.

**Survey elements: narrow, never assert.** Questions and content elements share `SurveyElementBase` and live together in `Survey.elements`. To reach a kind-specific field, branch through `isSurveyQuestion` / `isSurveyContent` (exported from the main index). Never write `element as { kind?: string }` or `element as { config?: unknown }` — see the Typing Discipline section in the root `AGENTS.md`.

## Key Source Areas

```
src/
├── model/constructor/   # ~20 domain model classes (Survey, User, Payment, etc.)
├── model/schema/        # ~40 mzen-schema validation schemas
├── model/service/       # Patcher, PatchBuffer, SurveyValidation, SurveyResponseValidator
├── model/price/         # SubscriptionPriceCalculator
├── model/invoice/       # Invoice display helpers (billToName, formatInvoicePeriod, REVERSE_CHARGE_NOTICE) shared by api PDF generation and app invoice UI
├── model/tax/           # VatCalculator, LocalCurrencyFormatter, euVatRates
├── util/                # SurveyImportValidator, CodeGenerator, password/subdomain validators
└── index.ts             # Main exports
```

When adding a `Date`-typed field to a schema/constructor, follow the timestamp naming convention in the root `AGENTS.md` (`At`/`From`/`To`/`Start`/`End`/`Until` suffixes, or the bare lowercase form when nested).

## mzen Dependencies

`mzen-schema`, `mzen-om`, and `mzen-id` are workspace submodules at `external/mzen/`. If you modify them, rebuild common afterwards: `pnpm build:common`.

## Testing

Jest + ts-jest. Tests colocated with source (`src/**/*.test.ts`). Fake timers enabled globally for deterministic date testing.
