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

## Mixin composition

`Survey` and `SettingSurvey` are built with `mix(Base).with(MixinA).with(MixinB).base` (`model/constructor/mix.ts`), which reads in application order and type-checks each mixin's constraint against the chain so far. Mixins are grouped into `SurveyCoreBundle`, `SurveyStructureBundle` and `SurveySettingsBundle` (the last is a function of its base, shared by both classes). Add a mixin to the matching bundle, not to `Survey.ts`. Six settings groups that only merge into defaults (`access`, `data`, `participant`, `contentFormat`, `schedule`, `notify`) are built by `nestedSettingMethods(key, defaults)` (`SettingSurvey/mixin/`), so go-to-definition on `setAccessProperty` lands on the factory; `language`, `presentation`, `stats`, `dataPolicy` and `legalNotice` stay hand-written because they have logic. `Survey.prototype.test.ts` snapshots every effective method on both classes, so a changed override order shows up there.

## Inferred model types

Constructors take their field types from the schema: define it as `class SchemaX extends Schema.from(sb.schema(...).shape({...})) {}` (the class is the only export; a plain spec is exported only when several schemas share it; an extension that builds on a generated schema spreads `new SchemaX().builderFields()`), and build the model with `class X extends SchemaConstructor.from(SchemaX, options) {}` (see `src/model/constructor/DataTransferJob.ts`); behaviour goes in the class body. Schema references are lazy, `sb.ref(() => new SchemaL10n())`, never name strings. Every flat model is migrated (interface first, see Generated schemas below), plus the Survey family's plain fields. The list is `Migrated` in `inferredTypes.type-test.ts`. Left hand-written because the class type is not the schema type: `SurveyResponse`, the `SettingSurvey` and `Survey` classes (their schemas are generated), `SettingProject`, `L10n`, `SurveyQuestion`, `SurveyContent` and the collections. `SurveyElementBase`, `SurveySection`, `SurveySubquestion` and `SurveySnapshotPartial` are migrated too; the first three get `withChanges` from the `immutableEntity()` mixin. `User` and `UserEmailMeta` keep hand-written classes (the `user` schema itself is generated); `UserClient` and the other generated models build their constructors with `SchemaConstructor.from`; `UserAccessToken` stays a marked, hand-written reference. `SchemaConstructor.from` types its input as raw data (plain objects, `null` for missing, `extras` keys), so `SurveyAnswerOption`, `SurveyParticipant`, `SurveyPublication` and `EmailTemplate` use it; see datacapy's `package/schema/docs/constructors.md`. Never convert a constructor without first committing a `*.equivalence.test.ts` snapshot of the old behaviour; see the ADR for the options and which models stay explicit. Details: root `docs/typing-discipline.md`.

## Generated schemas

Models tagged `@schema` (listed in `datacapy.config.json` `include`) have their schema generated into `<Model>.schema.ts` beside them: `EmailTemplate`, `DataTransferJob`, `UserClient`, `ProjectAdmin`, `SettingProject`, and the participant-attribute and survey-language families (six models), `SurveyPublication`, `Notification`, `File`, `Project`, `User` (its class stays hand-written; an extension spreads `new SchemaUser().builderFields()` to add fields), and the server-only `Task`, `TaskExecution` and `EmailSuppression` (beside their classes in `src/server/constructor/`). The Survey family's schemas are generated from stored-shape interfaces, not from the class types: `SettingSurveyDocument` (`SchemaSettingSurvey`, nearly every field nullable with a `null` default), `SurveyDocument extends SettingSurveyDocument` (`SchemaSurvey`) and `SurveySnapshotDocument`. The classes stay hand-written; `SettingSurveyMixinBase`, `SurveyData` and `SurveyInterface` take their nested settings groups from `SettingSurveyDocument`, so add a settings field there only. The hand-written `L10n*`, `SurveySection` and `SurveyElement` schemas are referenced through `importMap` to marker interfaces in `EmbeddedSchemaData.ts` (a target must be a named `@schema` interface, not a type alias). Free-form JSON fields use `t.Opaque` with `t.NonStrict`. A generated file is never edited by hand. `pnpm gen` rewrites them, `pnpm gen:report` lists unsupported properties, and `pnpm lint` runs `gen:check` so a stale file fails; the pre-commit hook checks it when `package/common` sources are staged. Record an equivalence snapshot before converting a model. Schema-validation checks (`schemaBehaviour`, then `expectValidAndStrict`) go in their own `*.schema.equivalence.test.ts` file starting with `jest.useRealTimers()`: under the global fake timers every `Date` field fails to cast (`ClockDate`), so a valid document is reported invalid and the check proves nothing. Constructor snapshots keep the fake timers, which pin `now`.

## datacapy Dependencies

`@datacapy/schema`, `@datacapy/om`, and `@datacapy/id` are workspace submodules at `external/datacapy/`. If you modify them, rebuild common afterwards: `pnpm build:common`.

## Testing

Jest + ts-jest. Tests colocated with source (`src/**/*.test.ts`). Fake timers enabled globally for deterministic date testing.
