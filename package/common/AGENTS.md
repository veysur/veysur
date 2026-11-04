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

Subpath export entry points:

| Import | Content |
|--------|---------|
| `veysur-common` | Main index: models, utilities, Logger |
| `veysur-common/model/constructor` | Constructor types only |
| `veysur-common/model/schema` | Validation schemas only |
| `veysur-common/server` (also `/server/schema`, `/server/constructor`) | Server-only models: `Task`, `TaskExecution`, `EmailSuppression` and their schemas |

## Important Caveats

**`src/server/` is server-only.** Models the browser never needs live there, not in `src/model/`, so they are absent from the main index and from the client `schemaManager`. `api` registers them through its own constructor and schema barrels. `app` and `app-cloud` may not import `veysur-common/server` (lint-enforced). A model that a shared schema embeds (for example `UserClient` inside `User`) stays in `src/model/`.

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
├── model/constructor/   # ~20 domain model classes (Survey, SurveyParticipant, Project, etc.)
├── model/schema/        # ~40 @datacapy/schema validation schemas
├── model/service/       # Patcher, PatchBuffer, SurveyValidation, SurveyResponseValidator
├── util/                # SurveyImportValidator, CodeGenerator, password/subdomain validators
└── index.ts             # Main exports
```

When adding a `Date`-typed field to a schema/constructor, follow the timestamp naming convention in the root `AGENTS.md` (`At`/`From`/`To`/`Start`/`End`/`Until` suffixes, or the bare lowercase form when nested).

## Inferred model types

Constructors take their field types from the schema: define it as `class SchemaX extends Schema.from(sb.schema(...).shape({...})) {}` (the class is the only export; a plain spec such as `projectBaseSpec` is exported only when several schemas share it), and build the model with `class X extends SchemaConstructor.from(SchemaX, options) {}` (see `src/model/constructor/DataTransferJob.ts`); behaviour goes in the class body. Schema references are lazy, `sb.ref(() => new SchemaL10n())`, never name strings. Nearly every flat model is migrated, plus the Survey family's plain fields. The list is `Migrated` in `inferredTypes.type-test.ts`. Left hand-written because the class type is not the schema type: `SurveyResponse`, `SettingSurvey`, `SettingProject`, `L10n`, `SurveyQuestion`, `SurveyContent` and the collections. `SurveyElementBase`, `SurveySection`, `SurveySubquestion` and `SurveySnapshotPartial` are migrated too; the first three get `withChanges` from the `immutableEntity()` mixin. `User`, `UserClient`, `UserAccessToken` and `UserEmailMeta` stay on the older pass-through constructors. `SchemaConstructor.from` types its input as raw data (plain objects, `null` for missing, `extras` keys), so `SurveyAnswerOption`, `SurveyParticipant`, `SurveyPublication` and `EmailTemplate` use it; see datacapy's `package/schema/docs/constructors.md`. Never convert a constructor without first committing a `*.equivalence.test.ts` snapshot of the old behaviour; see the ADR for the options and which models stay explicit. Details: root `docs/typing-discipline.md`.

## datacapy Dependencies

`@datacapy/schema`, `@datacapy/om`, and `@datacapy/id` are workspace submodules at `external/datacapy/`. If you modify them, rebuild common afterwards: `pnpm build:common`.

## Testing

Jest + ts-jest. Tests colocated with source (`src/**/*.test.ts`). Fake timers enabled globally for deterministic date testing.
