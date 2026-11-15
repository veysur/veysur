# Endpoint configs are generated from tagged service classes

**Status:** accepted
**Decided:** 2026-11-14
**Scope:** package/api (and any extension that adds endpoints)

## Context

The hand-written configs in `src/endpoint/` restated what the service method already says:
the service name on every endpoint, `projectId` as an `X-Project-Id` header, each path
parameter twice (in `path` and in `data`), and a `method` beside a key. Nothing checked that
a `:name` in a path had a `data` entry. 32 `default:` entries were silently ignored, because
the request parser only reads `defaultValue`.

## Decision

- A service class carries `@endpoints <name>`; each exposed method carries `@route` and `@acl`.
  The endpoint key is the method name (the old keys such as `getAllSurvey` fed only `disable` and
  `groups`, which nothing uses). Parameters are tagged with
  `tagsEndpoint` types (`e.Param`, `e.Header<'X-Project-Id'>`, `e.Body`, ...).
  `datacapy-gen` writes `<Service>.endpoints.ts` beside the service; `pnpm lint` runs
  `gen:check`. Design and tag reference: datacapy `package/codegen/docs/endpoints.md`.
- Access is always stated per route (`@acl public` for open endpoints). The five endpoints
  that had no ACL of their own relied on the service-level rule and now say so.
- `Const` (`src: 'const'`) is dropped: its two uses were dead (the parser has no handler).
- `default:` becomes `defaultValue` and is now applied. Where the service already fell back
  to the same value nothing changes. `getPublished` kept the service's own `withData = true`
  (the endpoint's ignored `default: false` was not carried over).
- One method serves one route. Where two routes shared a method (`getOne` for survey and
  project templates, `getActive` for one project and for all), a thin wrapper method serves
  the second.
- Request inputs that were never part of the endpoint (an internal `context`) are not
  parameters of the exposed method: `ServiceSurvey.patch` delegates to `patchInContext`.

## Consequences

- Core services that an extension re-exposes under another prefix cannot be tagged from the
  extension, so those configs stay hand-written (`eventLog` in api-cloud) and core's
  `project` config stays hand-written because it is edition-conditional.
- Untyped service parameters gained real types, which surfaced a few loose test fixtures.
- Typing a parameter as `unknown` loses its tag (`unknown & e.Body` is just `e.Body`), so
  untyped body fields need a concrete type.
- Equivalence of each migrated config is pinned by `src/endpoint/**/*.config.test.ts`,
  recorded from the hand-written config before it was deleted.
