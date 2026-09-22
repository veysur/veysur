# Agent Guidelines for VeySur REST API (repo/api/)

## Project Overview
REST API server built with mzen-server framework and TypeScript. Provides backend services for the VeySur platform.

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
- **Testing**: Jest with ts-jest, tests colocated in `src/**/*.test.ts`
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
- **`platform/`** — Reserved for services that an extension adds. Not part of this repo; an extension supplies this tree through the composition seam (`model-manager.ts`, `config/edition.ts`).
- **root** — Cross-cutting infrastructure used by both: `ServiceAuth`, `ServiceUser`, `ServiceProject`, `ServiceEmail`, `ServicePing`, etc.

**Decision rule**: Does it belong to an extension rather than this repo? → `platform/`. Is it needed by every deployment and not survey-specific? → root of `model/service/`. Survey-specific? → `core/`.

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
- `csvStream` — stream data as CSV to Express response
- `s3Client` — file storage abstraction (S3 / local filesystem)
- `escapeRegex` — escape user input for use in MongoDB regex queries
- `dateFilterUtils` — build MongoDB date range query conditions

### Endpoints (`src/endpoint/`) and URL prefixes

Directory layout mirrors services (`core/`, `platform/`, `shared/`). All platform endpoints (those an extension adds) use an explicit `path: '/platform/<service-name>'` root prefix. Core and shared endpoints have no root `path` — mzen-server derives the URL from the service name automatically.

```typescript
// Core / shared — URL derived from service name automatically
export const surveyConfig = {
  service: 'survey',          // → /survey/*
  endpoints: { ... },
}

// Platform (added by an extension) — explicit /platform/ prefix
export const exampleConfig = {
  service: 'example',
  path: '/platform/example',  // → /platform/example/*
  endpoints: { ... },
}
```

**The `/platform/` prefix is about functionality, not frontend origin.** It marks endpoints that an extension adds and that are not part of this repo. The URL prefix does not indicate which frontend app makes the request; it indicates that the feature comes from an extension.

**Frontend reminder**: any API class or fetch call in `package/app` targeting a platform endpoint must include `platform/` in its URL string, e.g. `'platform/example/list'` not `'example/list'`.

**Project-scoped endpoints**: for any endpoint operating on a single project's data, use `role: 'projectOwner'`/`'projectAdmin'` ACL rules — not a generic role plus a manual ownership check in the service. See `docs/mzen-acl.md`.

### Repos (`src/model/repo/`)

Two subdirectories plus root-level files:

- **`core/`** — project datasource (`dataSource: 'project'`), survey platform repos: `RepoSurvey`, `RepoFile`, `RepoSurveyResponse`, etc.
- **`platform/`** — default datasource, repos that an extension adds. Not part of this repo; see the `platform/` note above.
- **root** — default datasource, infrastructure: `RepoUser`, `RepoProject`, `RepoEmail`, `RepoTask`, etc.

**Decision rule**: Does the repo use `dataSource: 'project'`? → `core/`. Added by an extension? → `platform/`. Otherwise → root of `model/repo/`. Data source and category always align — all `core/` repos use the project datasource; `platform/` and root repos use the default.

**Import via barrel** (`from 'model/repo'`) — avoid direct file-path imports.

**Indexes on Date-typed fields must set `typeHint`** (e.g. `{ typeHint: { createdAt: TYPE_HINT_TIMESTAMP } }`) — without it, mzen-om generates a plain `VARCHAR` column and range queries (`$lte`/`$gte`/etc.) silently compare dates lexicographically instead of chronologically. See `external/mzen/package/mzen-om/docs/mysql-indexes.md`.

**Any direct `repo.getDataSource(context)` call must be paired with `repo.releaseDataSource(context)` in a `finally` block.** This bypasses the normal CRUD methods (`find`/`insert`/`update`/etc.), which already pair acquire/release internally — needed when a migration patch runs raw SQL (e.g. `RENAME TABLE`) that has no repo method. Skipping the release leaks a `DataSourceRegistry` ref count that never reaches zero, so the registry can never close that dynamic (per-project) datasource — harmless in a one-shot migration job that exits right after, but a real leak in any longer-lived process. See `2026-09-09_1000_reshape-survey-section-element.ts` for the reference pattern.

## Key Dependencies
- mzen-server framework for REST API (see Framework Details below)
- bcryptjs for password hashing
- jsonwebtoken for authentication
- nodemailer for email services
- handlebars for templating
- moment-timezone for date handling
- veysur-common shared library

## Framework Details

### mzen (NodeJS Application Model)
- **Repository**: https://github.com/kevin-foster-uk/mzen
- **Version**: 0.1.0
- **Description**: NodeJS application model with ODM capabilities and schema-based data validation
- **Architecture**:
  - **Schemas**: Define data structures and validation rules for documents
  - **Repositories**: Handle data persistence and retrieval from databases
  - **Services**: Manage interactions between repositories (checkout, authenticator, report-generator, email)
- **Key Features**:
  - **Object Document Mapping (ODM)**: Populate documents into constructor instances
  - **Document Relations**: Comprehensive relationship support with auto-population
    - hasOne, hasMany, hasManyCount (count of related documents)
    - belongsToOne, belongsToMany (many-to-many with embedded reference arrays)
    - embeddedHasOne, embeddedHasMany, embeddedBelongsToOne, embeddedBelongsToMany
    - Basic query optimization with configurable auto-population
  - **Data Validation & Type-casting**:
    - Built-in validators: required, notNull, notEmpty, length (min/max), regex, equality, email
    - Custom validator support
    - Automatic type-casting with failure validation errors
    - ObjectID type support (BSON/MongoDB)
  - **Default Values**: Used during validation, insert, or update when fields are undefined/null
  - **Data Sources**: Currently supports MongoDB only

### mzen-schema (Data Schema Library)
- **Repository**: Part of mzen-project ecosystem
- **Version**: 0.1.0
- **Description**: Standalone Javascript data schema definition and validation library
- **Key Features**:
  - Define Javascript data structure schemas with validation rules
  - Type-casting and default value population
  - Schema composition via named schema references
  - Strict mode validation for undefined fields
  - Field labeling for validation error messages
  - Multiple validator instances per field with custom messages

### mzen-server (REST API Server)
- **Repository**: https://github.com/kevin-foster-uk/mzen-server
- **Version**: 0.1.0
- **Description**: NodeJS REST API server wrapper for mzen domain model
- **Key Features**:
  - **ExpressJS Integration**: Built as wrapper around ExpressJS with middleware compatibility
  - **Auto-exposure**: Automatically exposes repositories and services as REST endpoints
  - **Configurable Access**: Repository exposure is configurable for security
  - **Request Processing**: Validation and type-casting of incoming request data
  - **Authentication**: Token-based authentication with custom implementation support
  - **Authorization**: Access control lists (ACL) with user authorization
  - **Dynamic Roles**: Role assessment on each request with default and custom role support

## Development Notes
- Uses relaxed TypeScript configuration for flexibility
- API routes follow RESTful conventions
- Authentication with JWT tokens
- Email templates with Handlebars
- Shared code via veysur-common dependency

## Background Jobs

Recurring/scheduled work (e.g. `ServicePaymentScheduler.processDuePayments`, file cleanup, FX rate fetching) runs via the generic `ServiceTaskManager`, triggered by a k8s CronJob every minute and gated by each `Task` record's own interval. See `docs/task-manager.md` for adding new scheduled tasks, concurrency/locking, and manual triggering. Bulk survey invite/reminder sends are paced through this same infrastructure — see `docs/mail-queue-pacing.md`.

## Anonymous Surveys

The `survey.access.anonymous` setting guarantees a response carries no
`participantId`, no `ip`/`referrerUrl`, and no real timestamps (every date field
is set to the `ANONYMISED_TIMESTAMP_ISO` sentinel from `veysur-common`). The
participant JWT is issued with `participantId: null`, and `sessionId` is a
non-time-based `randomSessionId()` value. See `docs/anonymous-surveys.md`.

## Country Blocking

Access from countries without required local legal representation (e.g. Switzerland, Turkey) is blocked via `ServiceGeo`, an env-configured `BLOCKED_COUNTRIES` list, and enforcement in both the frontend gate and server-side registration paths. See `docs/country-blocking.md`.

## Disposable Email Domain Blocking

Every path where a user sets/changes their own email — signup, survey participant registration, and account profile email change — rejects known disposable/temporary email domains via `ServiceEmailDomainCheck`, which is a no-op unless a deployment registers its own `emailDomainBlock` repo. See `docs/disposable-email-blocking.md`.

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