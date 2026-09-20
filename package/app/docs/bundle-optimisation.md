# Bundle Optimisation

The apps (`appAdmin`, `appSurvey`, `appAccount`) have very different
dependency footprints. `appSurvey` is a public-facing survey-taking interface; it needs a small
subset of `veysur-common` and none of the admin or validation logic. The configuration
described here ensures each app's bundle contains only what it actually uses.

## Route and component-level code-splitting

Every `Router.tsx` file use `lazyWithChunkReload` (`common/lazyWithChunkReload.ts`) for route-level imports. This wraps `React.lazy()` and auto-reloads the page once on `ChunkLoadError`, preventing blank screens after a deployment invalidates old chunk hashes.

- **Routes** — each `Router.tsx` lazy-loads all page components. Each app's `App.tsx` wraps `RouterProvider` in `<Suspense fallback={<RouteLoading />}>` to show a spinner while the initial route chunk fetches.
- **Question type components** — `component/SurveyQuestionType/getQuestionType.ts` uses `React.lazy()` for every registry entry. Each type (including the heavy `QuestionTypeRanking` with dnd-kit, and `QuestionTypeMatrix`) becomes its own chunk fetched only when a question of that type is first rendered. `SurveyQuestionRenderer` provides a per-question `Suspense` boundary that catches these suspensions.

**Suspense fallback rule:** a component used as a Suspense fallback above `RouterProvider` renders outside Router context. Do not use components that call `useNavigate`, `useParams`, or any other Router hook there. Use `<NavbarBrand href="/" />` (plain `<a>` tag) instead of `<NavbarBrandAdmin />` for any loading shell that must appear before the router mounts.

RSBuild handles the chunking automatically — no configuration changes are needed when adding new lazy imports.

## Separate bundles per app

`rsbuild.config.ts` defines one entry point per app:

```ts
source: {
  entry: {
    admin:    './src/appAdmin/index.tsx',
    survey:   './src/appSurvey/index.tsx',
    account:  './src/appAccount/index.tsx',
  }
}
```

Each entry produces an isolated bundle. Code imported only by `appAdmin` (survey editor,
validation, patch buffering) is never included in the `appSurvey` bundle. RSBuild traces
the import graph from each entry independently.

Per-app configs (`rsbuild.survey.config.ts`, `rsbuild.admin.config.ts`, etc.) exist for focused
dev sessions and CI steps that build a single app.

## `veysur-common` dual CJS/ESM output

`veysur-common` builds to two output formats:

| Format | Path        | Consumer                |
| ------ | ----------- | ----------------------- |
| CJS    | `dist/cjs/` | Node.js API (`require`) |
| ESM    | `dist/esm/` | RSBuild (tree-shaking)  |

The `package/common/package.json` `exports` field routes each consumer to the right format:

```json
"exports": {
  ".": {
    "import":  "./dist/esm/index.js",
    "require": "./dist/cjs/index.js",
    "types":   "./dist/cjs/index.d.ts"
  }
}
```

**Why ESM matters for tree-shaking:** RSBuild (Rspack) can only statically analyse `import`/`export`
statements. CJS `require()` calls are opaque at build time — the bundler must include the entire
module. With an ESM build, RSBuild can trace exactly which exports are used per entry point and
eliminate the rest.

**`"sideEffects": false`** in `package/common/package.json` tells RSBuild that every export in
`veysur-common` is free of side effects. Without this, the bundler must conservatively include all
re-exported modules even if none of their exports are referenced.

**`"typesVersions"`** exists alongside `exports` because the API's TypeScript config uses
`moduleResolution: node`, which predates `exports` field support. `typesVersions` provides
equivalent type resolution for the subpath exports (see below) for that older resolver.

## No barrel re-exports of external CJS packages

`veysur-common/src/index.ts` does **not** re-export `mzen-schema`, `mzen-id`, or `moment-timezone`.

These packages have CJS-only builds. When an ESM barrel does `export * from 'mzen-schema'`, the
bundler cannot statically enumerate what `mzen-schema` exports (it's a CJS module), so it includes
the entire package — even for bundles that use none of those symbols.

By removing the re-exports:

- `appSurvey` never pulls `mzen-schema`, `mzen-id`, or `moment-timezone` into its bundle
- `appAdmin` and `appAccount` import those packages directly and declare them as explicit
  dependencies in their own `package.json`

**Rule:** do not add `export * from '<cjs-package>'` to `veysur-common/src/index.ts`. If a
package does not have an ESM build, barrel re-exporting it defeats tree-shaking for every consumer.

## `veysur-common` subpath exports

`package/common/package.json` exposes three subpaths in addition to the main entry:

```json
"./model/constructor":        { "require": "...", "types": "..." },
"./model/schema":             { "require": "...", "types": "..." },
"./util/generateSurveyHash":  { "require": "...", "types": "..." }
```

**`model/constructor` and `model/schema`** exist because the API imports these namespaces directly
(e.g. `import * as schemasCommon from 'veysur-common/model/schema'` to enumerate all schema
classes). These are CJS-only subpaths — they are not needed by browser bundles.

**`util/generateSurveyHash`** is intentionally excluded from the main index. It uses Node.js
`crypto` and must never be bundled into a browser build. Exposing it as a subpath keeps it
available server-side while keeping it out of the browser barrel.

## Rules for future changes

- **Do not** add `export * from '<cjs-only-package>'` to `veysur-common/src/index.ts`
- **Do not** remove `"sideEffects": false` from `package/common/package.json`
- **Do not** remove `"module"` field from `package/common/package.json`
- **Do not** render components that call Router hooks (`useNavigate`, `useParams`, etc.) as Suspense fallbacks above `RouterProvider`
- **Do** add a subpath export (not a main index export) for any new server-only utility in
  `veysur-common` that uses Node.js built-ins — follow the `generateSurveyHash` pattern
- **Do** add a subpath export if the API needs namespace-level access to a new directory of exports
- **Do** use `lazyWithChunkReload` when adding new route-level lazy imports in `Router.tsx` files
- **Do** use `React.lazy()` when adding new question type components to `getQuestionType.ts`
