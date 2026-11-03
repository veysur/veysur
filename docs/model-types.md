# Model types and constructor defaults

A model's TypeScript type and its starting values both come from its DataCapy schema spec. The
fields are listed once, in `package/common/src/model/schema/`, never again on the class.

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

Export a plain spec of builders (`projectBaseSpec`) only when several schemas share it, and then pass it to `Schema<typeof projectBaseSpec>` and `Infer<typeof projectBaseSpec>`. `Infer` and `sb.defaultsFor` accept a schema class, a schema instance or a spec.

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
`null` for nullable fields in strict callers), or the class already extends a base (`ImmutableEntity`).

Convert a constructor only behind a committed `*.equivalence.test.ts` snapshot recorded on the old code.

## Reference

- API: [`@datacapy/schema` builder guide](../external/datacapy/package/schema/docs/builder.md#inferring-types).
- Rationale, findings and which models stay explicit: the `schema-inferred-types` decision record in the
  VeySur cloud repository's `docs/decisions/`.
