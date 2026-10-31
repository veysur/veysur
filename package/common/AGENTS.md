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
| `veysur-common` | Main index: models, utilities, Logger |
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
├── model/constructor/   # ~20 domain model classes (Survey, SurveyParticipant, Project, etc.)
├── model/schema/        # ~40 @datacapy/schema validation schemas
├── model/service/       # Patcher, PatchBuffer, SurveyValidation, SurveyResponseValidator
├── util/                # SurveyImportValidator, CodeGenerator, password/subdomain validators
└── index.ts             # Main exports
```

When adding a `Date`-typed field to a schema/constructor, follow the timestamp naming convention in the root `AGENTS.md` (`At`/`From`/`To`/`Start`/`End`/`Until` suffixes, or the bare lowercase form when nested).

## Inferred model types

Constructors take their field types from the schema shape: export the shape (`projectBaseShape`), type the schema class as `Schema<typeof shape>`, and merge `interface X extends Infer<typeof shape> {}` into the class. See `src/model/constructor/Project.ts`. Schema references are lazy, `sb.ref(() => new SchemaL10n())`, never name strings. Nearly every flat model is migrated, plus the Survey family's plain fields (`SurveyAnswerOption`, `SurveySubquestion`, `SurveySection`, `SurveyElementBase`, `Survey`'s own fields). The list is `Migrated` in `inferredTypes.type-test.ts`. Left hand-written because the class type is not the schema type: `SurveyResponse`, `SettingSurvey`, `SettingProject`, `L10n`, `SurveyQuestion`, `SurveyContent` and the collections. A migrated constructor keeps its own defaulting constructor, drops the field list, and lists only relation fields it populates. Details: root `docs/typing-discipline.md`.

## datacapy Dependencies

`@datacapy/schema`, `@datacapy/om`, and `@datacapy/id` are workspace submodules at `external/datacapy/`. If you modify them, rebuild common afterwards: `pnpm build:common`.

## Testing

Jest + ts-jest. Tests colocated with source (`src/**/*.test.ts`). Fake timers enabled globally for deterministic date testing.
