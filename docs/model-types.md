# Model types and constructor defaults

A model's TypeScript type and its starting values both come from one place, so the fields are
listed once and never again on the class: the tagged interface for a generated model, the
DataCapy schema spec for the rest.

There are two directions. A model is on one of them, never both:

- **Interface first.** Every model listed in `package/common/datacapy.config.json` has a tagged TypeScript interface as its source, and `pnpm gen` writes the schema beside it (see below). This covers every flat model.
- **Schema first.** The rest are written with the builder and typed with `Infer` (the sections after this one): `SurveySection`, `SurveyElement`, `SurveyResponse`, `L10n` and the collections, where the class type is not the schema type. The `settingSurvey`, `survey` and `surveySnapshot` schemas are generated (interface first) from `SettingSurveyDocument`, `SurveyDocument` and `SurveySnapshotDocument`.

## Interface-first models

Write the interface and mark it in its JSDoc. Tags from `@datacapy/schema` on the property types describe what the builder would otherwise say:

```ts
import type { tags as t } from '@datacapy/schema'

/** @schema task construct=Task strict */
export interface TaskData {
  _id: (string & t.MaxLength<17>) & t.Default<''>
  name: string & t.Required & t.Init<''> & t.Trim & t.MaxLength<255>
  options: Record<string, unknown> & t.NonStrict & t.Default<t.EmptyObject>
  lastRunAt: (Date & t.Default<null>) | null
}

export class Task extends SchemaConstructor.from(SchemaTask) {}
```

Run `pnpm gen` in the package. It writes `<Model>.schema.ts` (the schema class and an `AssertSchema` check that fails typechecking if the two drift) and `pnpm lint` runs `pnpm gen:check`, as does the pre-commit hook, so a stale generated file fails. Never edit a `*.schema.ts` file. Add the interface's file to `include` in `datacapy.config.json`.

Tags that need care:

- `Required` keeps `required()` beside `Default` or `Init`, which otherwise stand in for it. `NotNull` adds `notNull()`, because `required()` alone accepts `null`.
- A free-form JSON field is `Opaque` or `Record<string, unknown>`, plus `NonStrict`. Strictness is inherited by nested objects, so without `NonStrict` an opaque object in a strict schema rejects every key it holds. `Opaque` also works on a property inside an array of objects.
- `Default` and `Init` take a literal, `EmptyObject`, `EmptyArray` or an object of literals such as `Init<{ period: 'month'; day: 1 }>`.
- Array items are always required, so a `null` entry is rejected where a hand-written `sb.array(Number)` allowed it.
- An object field with a `null` default is generated with `nullable()`, which keeps a `null` from becoming `{}`.
- The generated class takes its name from the registered schema name (`sb.schema('subscriptionPlan')` gives `SchemaSubscriptionPlan`).

A schema that extends a generated one spreads its fields into a schema of the same name:

```ts
export class SchemaUserExtended extends Schema.from(
  sb
    .schema('user')
    .construct('User')
    .strict()
    .shape({ ...new SchemaUser().builderFields(), ...extraFields }),
) {}
```

Convert a hand-written model only behind two committed snapshots recorded on the old code. The constructor snapshot (`*.equivalence.test.ts`) keeps jest's fake timers, which pin `now`. The schema snapshot goes in its own `*.schema.equivalence.test.ts`, starts with `jest.useRealTimers()`, and ends each case with `expectValidAndStrict(behaviour)`: under fake timers every `Date` field fails to cast, so a valid document is reported invalid and the check proves nothing. Include a rejected document for each constraint the model relies on (`notNull`, `inArray`, a missing required key).

## Type

Define the schema as one class with `Schema.from()`, then merge the inferred type into the model class. The schema class is the only export:

```ts
export class SchemaProject extends Schema.from(
  sb
    .schema("project")
    .construct("Project")
    .shape({
      _id: sb.string().required(),
      name: sb.string().required().trim(),
      archived: sb.boolean().default(false),
    }),
) {}

/** Fields come from {@link SchemaProject}. */
export interface Project extends Infer<SchemaProject> {}
export class Project {
  /* constructor(data: Partial<Infer<SchemaProject>>) */
}
```

Export a plain spec of builders  only when several schemas share it, and then pass it to `Schema<typeof spec>` and `Infer<typeof spec>`. `Infer` and `sb.defaultsFor` accept a schema class, a schema instance or a spec.

- `required()` or `default()` makes the key non-optional. Add `.optional()` where callers build partial objects.
- A bare `sb.object()` or `sb.array()` infers `any`. State the type with `.shape()`, `.of()` or `.as<T>()`, put `.as<T>()` last, and add the model to `Migrated` in `inferredTypes.type-test.ts` so `pnpm typecheck` fails on any `any`.
- Schema references are lazy: `sb.ref(() => new SchemaL10n())`, never a name string.
- Schema modules export schema classes, specs and constants only, because `schema-manager.ts` calls `new` on every function export.

## Constructor defaults

Extend `SchemaConstructor.from`; the class is the only export and its instance type is the schema's inferred type:

```ts
export class Project extends SchemaConstructor.from(SchemaProject, options) {
  // methods only
}
```

A key takes its `default()` value, else its `init()` value. Use `init(value)` for a `required()` field
the constructor starts at `''` or `0`, since `required().default(x)` would accept a missing value.
`options` (`cast`, `skip`, `sparse`, `transform`, `extras`, `overrides`) adjust how
raw data becomes an instance.

Keep the older `sb.defaultsFor` plus merged-interface pattern when `SchemaConstructor.from` does not fit:
the constructor input type differs from the instance type (L10n `transform`s, `extras` accepted as input,
`null` for nullable fields in strict callers), or the class needs a base that `SchemaConstructor.from` cannot extend.

A survey leaf that needs `withChanges` (`SurveyElementBase`, `SurveySection`, `SurveySubquestion`) wraps the schema constructor in the `immutableEntity()` mixin from `ImmutableEntity.ts`: `class Core extends immutableEntity(SchemaConstructor.from(SchemaX))`. The entity mixins then layer on as before. A type the schema cannot express (the `Survey` held by `SurveySnapshotPartial`) is given with `.as<T>()`; callers building such a model from untyped JSON narrow the values first.

Convert a constructor only behind a committed `*.equivalence.test.ts` snapshot recorded on the old code.

## Client wire types

The app derives its API response types from the shared model types instead of re-declaring them: `AuthUser` picks its profile fields from `User`, `SettingProjectView` (exported by `veysur-common`) is `SettingProject` with the secret keys masked, and the notification unions index `Notification` and `DataTransferJob`. A type for a server-only model (for example an event-log row) is declared in the app by hand, since the app may not import `veysur-common/server`.

## Reference

- API: [`@datacapy/schema` builder guide](../external/datacapy/package/schema/docs/builder.md#inferring-types).
- Rationale, findings and which models stay explicit: the `schema-inferred-types` decision record in the
  VeySur cloud repository's `docs/decisions/`.
