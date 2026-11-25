# Agent Guidelines for VeySur REST API (repo/api/)

## Project Overview
REST API server built with @datacapy/server framework and TypeScript. Provides backend services for the VeySur platform.

## Build/Test Commands
- `pnpm start` - Start server with ./script/start.sh
- `pnpm start-background` - Start server in background
- `pnpm build` - Build TypeScript to dist/
- `pnpm test` - Run unit tests (Jest). Excludes `*.integration.test.ts`.
- `pnpm test:integration` - Run the MySQL integration suites (starts a throwaway MySQL; needs Docker).
- `pnpm test:integration:down` - Stop/remove that MySQL container.
- `pnpm test:all` - Unit tests, then the integration suites.
- `pnpm format` - Format code with Prettier
- `pnpm clean` - Clean dist/ directory

### Integration tests

Suites named `*.integration.test.ts` (currently a handful of repo tests plus
`ServiceTaskManager`) open a real `DataSourceMysql` in `beforeAll` and create disposable
`*Test` databases (`ensureDatabase: true`). They are excluded from `pnpm test` so a routine
unit run stays green without a database.

`pnpm test:integration` (`script/test-integration.sh`) needs only Docker: it brings up a
tmpfs-backed MySQL via `docker-compose.test.yml` (`docker compose up -d --wait`), points jest
at it on `127.0.0.1:33306`, and runs only the integration files. The container is left
running so repeat runs start instantly — `pnpm test:integration:down` removes it. It uses
`MYSQL_PASSWORD` from `config-dev.env` as the root password, so a throwaway container and a
real local MySQL are interchangeable. Extra args pass through to jest
(`pnpm test:integration -- RepoTask`).

## Code Style
- **Types**: TypeScript with relaxed settings (strict: false, noImplicitAny: false)
- **Testing**: Jest with ts-jest, tests colocated in `src/**/*.test.ts`. Console-noise policy (fail-by-default `console.error`/`console.warn`) lives in `src/test-utils/consoleGuard.ts`, wired via `tests/setupTests.ts` — see root `AGENTS.md`'s "Console Noise in Tests" section.
- **Imports**: Use ES6 imports, prefer named imports
- **Formatting**: Prettier config: 2 spaces, no semicolons, single quotes, trailing commas
- **Error Handling**: Use proper TypeScript error types, avoid `any`
- **Typing discipline**: see root `AGENTS.md` — avoid `any` and `as unknown as`; for mocking repo/service methods in tests, use the `getRepo`/`getService` map-and-cast pattern and the `asPrivate<S, O>()` helper (`src/test-utils/asPrivate.ts`)

## Code Organisation

### Import boundary (lint-enforced)

`model/service/core/**`, `model/repo/core/**`, `endpoint/core/**`, `endpoint/shared/**`,
`model/constructor/**`, `model/schema/**`, `model/entity/**`, `model/common/**`,
`common/**`, and `init/**` **may not import** `model/**/platform/**`, `endpoint/platform/**`,
or the extension package `veysur-common-cloud`. `pnpm lint` enforces this (`no-restricted-imports` in
`eslint.config.mjs`).

The rule runs at `error` — `pnpm lint` fails on any violation.

### Services (`src/model/service/`)

Two subdirectories plus root-level files:

- **`core/`** — Survey services: `ServiceSurvey`, `ServiceFile`, `ServiceSurveyParticipant`, `ServiceImportExport`, etc.
- **`platform/`** — Reserved for an extension. Not part of this repo.
- **root** — Cross-cutting infrastructure used by both: `ServiceAuth`, `ServiceUser`, `ServiceProject`, `ServiceEmail`, `ServicePing`, etc.

**Decision rule**: Is it needed by every deployment and not survey-specific? → root of `model/service/`. Survey-specific? → `core/`.

### Model Shared Utilities (`src/model/common/`)

Shared utilities and helpers used across the model layer. Import via `'model/common'` or `'model/common/<file>'`.

- `Registry` — generic base class for registry pattern
- `ipLookup` — IP geolocation adapter; default provider: ip-api.com (see `ipLookup/README.md` to add alternatives)
- `EmailTemplateLoader` — singleton loader for system email templates
- `HtmlToText` — HTML to plain-text converter for email
- `StringRandom` — random string generation
- `surveySearchUtils` — participant/response search query helpers

### Generic Server Utilities (`src/common/`)

Non-model utilities shared across the server. Import via `'common'` or `'common/<file>'`.

- `pagination` — parse/validate page+perPage query params
- `csvStream` — stream data as CSV to a neutral `HttpResponse`
- `s3Client` — file storage abstraction (S3 / local filesystem)
- `dateFilterUtils` — build MongoDB date range query conditions
- Search queries: a string `$regex` operand is a literal substring match (regex syntax and `%`/`_` are matched literally), so pass user search text straight in with no escaping. Pass a `RegExp` object only for a deliberate pattern.

### Endpoints and URL prefixes

Endpoint configs are generated: a service carries `@endpoints <name>`, each exposed method `@route <verb> <path>` and `@acl <role>` (or `public`), and parameters are tagged with `e.Param`, `e.Query`, `e.Body` and so on. `pnpm gen` writes `<Service>.endpoints.ts`; `pnpm lint` fails if one is stale. Never edit a `*.endpoints.ts` file. Project-scoped endpoints use `role: 'projectOwner'`/`'projectAdmin'`, not a manual ownership check. Tagging rules, route order and the hand-written exceptions: [docs/endpoints-and-init.md](docs/endpoints-and-init.md).

### Init middleware and the server adaptor (`src/init/`)

Init code is written against the neutral adaptor types, never Express (lint-enforced: no `express` import, no `server.app` / `server.router`). Register with `server.use`, `server.route`, `server.static`; stream with `res.stream`. Init tests over HTTP must pass on both `express` and `hono` (`describe.each`). Full rules: [docs/endpoints-and-init.md](docs/endpoints-and-init.md#init-middleware-and-the-server-adaptor-srcinit).

### Repos (`src/model/repo/`)

Two subdirectories plus root-level files:

- **`core/`** — project datasource (`dataSource: 'project'`), survey platform repos: `RepoSurvey`, `RepoFile`, `RepoSurveyResponse`, etc.
- **`platform/`** — Reserved for an extension. Not part of this repo.
- **root** — default datasource, infrastructure: `RepoUser`, `RepoProject`, `RepoEmail`, `RepoTask`, etc.

**Decision rule**: Does the repo use `dataSource: 'project'`? → `core/`. Otherwise → root of `model/repo/`. All `core/` repos use the project datasource; root repos use the default.

**Import via barrel** (`from 'model/repo'`) — avoid direct file-path imports.

**Declare `indexes` with `repib` and `relations` with `relb`** (from `@datacapy/server`), not hand-written `{ spec, options }` / `{ type, repo }` objects. **Indexes on Date-typed fields must set `typeHint`**: `repib.desc('createdAt').timestamp()` (or `.timestamp('field')` within a composite) does it. Without it, @datacapy/om generates a plain `VARCHAR` column and range queries (`$lte`/`$gte`/etc.) silently compare dates lexicographically instead of chronologically. The object key is the index name, so keep it stable. See `external/datacapy/package/om/docs/mysql-indexes.md` and `relations.md`.

**Any direct `repo.getDataSource(context)` call must be paired with `repo.releaseDataSource(context)` in a `finally` block.** This bypasses the normal CRUD methods (`find`/`insert`/`update`/etc.), which already pair acquire/release internally — needed when a migration patch runs raw SQL (e.g. `RENAME TABLE`) that has no repo method. Skipping the release leaks a `DataSourceRegistry` ref count that never reaches zero, so the registry can never close that dynamic (per-project) datasource — harmless in a one-shot migration job that exits right after, but a real leak in any longer-lived process. See `2026-09-09_1000_reshape-survey-section-element.ts` for the reference pattern.

## Framework

Built on @datacapy/server (REST), @datacapy/om (MySQL ORM) and @datacapy/schema, with JWT auth, bcryptjs, nodemailer, handlebars and moment-timezone. TypeScript is relaxed (`strict: false`). Library background: [docs/framework-reference.md](docs/framework-reference.md).

## Background Jobs

Recurring/scheduled work (e.g. file cleanup, mail queue dispatch) runs via the generic `ServiceTaskManager`, triggered by an external scheduler every minute and gated by each `Task` record's own interval. See `docs/task-manager.md` for adding new scheduled tasks, concurrency/locking, and manual triggering. Bulk survey invite/reminder sends are paced through this same infrastructure — see `docs/mail-queue-pacing.md`.

## Anonymous Surveys

The `survey.access.anonymous` setting guarantees a response carries no
`participantId`, no `ip`/`referrerUrl`, and no real timestamps (every date field
is set to the `ANONYMISED_TIMESTAMP_ISO` sentinel from `veysur-common`). The
participant JWT is issued with `participantId: null`, and `sessionId` is a
non-time-based `randomSessionId()` value. See `docs/anonymous-surveys.md`.

## Country Blocking

Optional country blocking runs through a `geo` collaborator that an extension registers; the self-hosted edition has none, so it is inert. See `docs/country-blocking.md`.

## Disposable Email Domain Blocking

Every path where a user sets/changes their own email — signup, survey participant registration, and account profile email change — rejects known disposable/temporary email domains via `ServiceEmailDomainCheck`, which is a no-op unless a deployment registers its own `emailDomainBlock` repo. See `docs/disposable-email-blocking.md`.

## Realtime

Server-to-client push (socket.io, Redis required when deployed) for hint events such as `notification.changed` (emit through `ServiceRealtime.emitToUser`) and `survey.changed`, which replaces polling in the survey editor (`ServiceSurvey.patch` calls `emitSurveyChanged` for the survey's room). See `docs/realtime.md`.

## Embedded Surveys

Publishing writes static, cacheable files so an embedded survey makes no API call until its first answer (`ServiceSurveyEmbedArtefact`). Anything that changes what those files contain must call `refresh`/`refreshProject`, and removing a snapshot or survey must remove its files. See `docs/embedded-surveys.md`.

## Participant Read Caching

Snapshot bodies on the response save path and the live publication, survey view and bot-protection reads on participant auth are cached (per-pod L1, shared Redis L2). Any write that changes them must call `surveyParticipantCache.invalidateSurvey` or `invalidateProject`. See `docs/participant-caching.md`.

## Pagination
When implementing pagination in service methods:
- Use `skip` (not `offset`) in repo.find() options - this maps to MongoDB's native skip
- Use `limit` for page size
- Use `parsePaginationParams()` from `common` to parse and validate page/perPage values
- Example:
  ```typescript
  const pagination = parsePaginationParams(page, perPage)
  const results = await repo.find(query, {
    limit: pagination.perPage,
    skip: (pagination.page - 1) * pagination.perPage,
    sort: { createdAt: -1 },
  })
  ```