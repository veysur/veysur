# Database Migrations

## Overview

VeySur uses [@datacapy/migrate](../../../external/datacapy/package/migrate/README.md) for controlled database schema changes and data seeding. This guide covers writing migrations in the API package.

`./scripts/deploy.sh` runs pending migrations for you, through the one-shot `migrate` service. To run them by hand, from `deploy/`:

```bash
docker compose --profile tools run --rm migrate --dry-run
docker compose --profile tools run --rm migrate
```

## Creating Migrations

### 1. Create Migration File

```bash
# Format: YYYY-MM-DD_HHMM_description.ts
mkdir -p package/api/migrate/2026/02
touch package/api/migrate/2026/02/2026-02-05_1430_add-feature.ts
```

### 2. Implement Migration

```typescript
import { DatabasePatchInterface } from '@datacapy/migrate'
import { ModelManager } from '@datacapy/om'

/**
 * Add new feature to database
 */
export default class AddFeature implements DatabasePatchInterface {
  version = '2026-02-05_1430'
  description = 'Add new feature'
  dataSourceName = 'account'  // 'account' for account database, 'project' for project databases

  async update(modelManager: ModelManager): Promise<void> {
    console.log('Adding new feature...')

    // Get repository
    const repo = modelManager.getRepo('user')

    // Your migration logic here
    // Examples:
    // - Create indexes: await repo.createIndexes()
    // - Insert data: await repo.create(data)
    // - Update records: await repo.updateMany(filter, update)

    console.log('✓ Feature added successfully')
  }
}
```

### 3. Test Migration

```bash
# Always test with dry-run first (from deploy/)
docker compose --profile tools run --rm migrate --dry-run

# If dry-run looks good, apply
docker compose --profile tools run --rm migrate
```

## VeySur-Specific Configuration

### Directory Structure

```
package/api/
├── migrate/                      # Migration patches
│   └── 2026/
│       └── 02/
│           ├── 2026-02-05_1000_init-indexes.ts
│           └── 2026-02-05_1001_task-seed.ts
└── src/
    └── script/
        └── migrate.ts            # Migration CLI runner
```

### DataSources

VeySur has two datasources:

| DataSource | Description | Usage | Context Required |
|------------|-------------|-------|------------------|
| `account` | Account-level database (veysurAccount) | User accounts, global data | No |
| `project` | Project-specific databases (veysurProject_*) | Survey data, project-specific content | Yes (`projectId`) |

**Account Database Migrations:**

```typescript
// Account database migration - no context needed
export default class AccountMigration implements DatabasePatchInterface {
  dataSourceName = 'account'
  version = '2026-02-06_1000'
  description = 'Add task indexes'

  async update(modelManager: ModelManager): Promise<void> {
    const repo = modelManager.getRepo('task')
    await repo.createIndexes()
  }
}
```

**Project Database Migrations:**

```typescript
// Project database migration - requires context when running
export default class ProjectMigration implements DatabasePatchInterface {
  dataSourceName = 'project'
  version = '2026-02-06_1100'
  description = 'Add survey status field'

  async update(modelManager: ModelManager): Promise<void> {
    // Repo is pre-wired to the project's actual datasource by the migration runner
    const surveyRepo = modelManager.getRepo('survey')
    await surveyRepo.updateMany({}, { $set: { status: 'draft' } })
  }
}
```

**Running with Context (locally):**

```bash
# Account database - no context needed
pnpm run migrate -- --datasource account

# Project database - requires projectId context
pnpm run migrate -- --datasource project --context projectId=abc123
```

### Available Repositories

Access VeySur repositories in migrations:

```typescript
async update(modelManager: ModelManager): Promise<void> {
  // Account database repos
  const userRepo = modelManager.getRepo('user')
  const projectRepo = modelManager.getRepo('project')
  const taskRepo = modelManager.getRepo('task')

  // Example: Create indexes
  await userRepo.createIndexes()
}
```

## Migration Properties

| Property | Description | Example |
|----------|-------------|---------|
| `version` | Unique identifier (YYYY-MM-DD_HHMM) | `'2026-02-05_1430'` |
| `description` | Human-readable description | `'Add user roles'` |
| `dataSourceName` | Target datasource | `'account'` or `'project'` |
| `update()` | Migration logic | `async update(modelManager) { ... }` |

## Example Migrations

### Example 1: Account Database - Creating Indexes

```typescript
export default class InitIndexes implements DatabasePatchInterface {
  version = '2026-02-05_1000'
  description = 'Initialize database indexes'
  dataSourceName = 'account'

  async update(modelManager: ModelManager): Promise<void> {
    const repoNames = ['user', 'project', 'task']

    for (const repoName of repoNames) {
      try {
        const repo = modelManager.getRepo(repoName)
        console.log(`Creating indexes for ${repoName}...`)
        await repo.createIndexes()
        console.log(`✓ Indexes created for ${repoName}`)
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠ Some indexes for ${repoName} already exist`)
        } else {
          throw error
        }
      }
    }
  }
}
```

### Example 2: Account Database - Seeding Data (Idempotent)

```typescript
const DEFAULT_TASKS = [
  { name: 'Mail Queue Process', task: 'email', action: 'processQueue', interval: 60 },
]

export default class SeedTasks implements DatabasePatchInterface {
  version = '2026-02-05_1001'
  description = 'Seed default scheduled tasks'
  dataSourceName = 'account'

  async update(modelManager: ModelManager): Promise<void> {
    const repo = modelManager.getRepo('task')

    // Check if already seeded (idempotent)
    const existingCount = await repo.count({})
    if (existingCount > 0) {
      console.log(`⚠ Found ${existingCount} existing tasks, skipping`)
      return
    }

    // Seed data
    console.log(`Seeding ${DEFAULT_TASKS.length} tasks...`)
    for (const data of DEFAULT_TASKS) {
      await repo.create(data)
      console.log(`✓ Created: ${data.name}`)
    }
  }
}
```

### Example 3: Project Database - Schema Update (Requires Context)

```typescript
export default class AddSurveyMetadata implements DatabasePatchInterface {
  version = '2026-02-06_1200'
  description = 'Add metadata field to surveys'
  dataSourceName = 'project'  // Targets dynamic project datasource

  async update(modelManager: ModelManager): Promise<void> {
    // Repo is pre-wired to the project's actual datasource by the migration runner
    const surveyRepo = modelManager.getRepo('survey')

    // Count surveys before update
    const surveyCount = await surveyRepo.count({})
    console.log(`Updating ${surveyCount} surveys in this project...`)

    // Add metadata field to all surveys (idempotent)
    await surveyRepo.updateMany(
      { metadata: { $exists: false } },
      { $set: { metadata: {} } }
    )

    // Verify
    const updatedCount = await surveyRepo.count({ metadata: { $exists: true } })
    console.log(`✓ ${updatedCount} surveys now have metadata field`)
  }
}
```

## Batch Migrations Across Projects

Use `--context-lookup "*"` with `--concurrency <n>` to run a `project`-datasource migration against every project, at up to `<n>` at a time:

```bash
pnpm run migrate -- --datasource project --context-lookup "*" --concurrency 5
```

Every invocation — single-database or batch — prints a **Run ID** at the start and in the
final summary. If any databases fail, use it to retry only what's outstanding:

```bash
pnpm run migrate -- --resume <runId> --concurrency 5
```

`--resume` works at any concurrency and skips every database that already succeeded —
their connections are never touched again — retrying only the pending/failed ones. See
[Migration Run Tracking](#migration-run-tracking-migrationlog) below for how this is
implemented.

**Patch idempotency caveat**: resuming is correct at the *database* level, but not
necessarily at the *patch* level. If a database's run failed mid-patch and that patch
isn't idempotent (e.g. a raw `DROP INDEX` with no `IF EXISTS`), `--resume` re-attempts the
same patch and can hit the same error again — fix the patch or correct the bad state
manually before retrying.

## Migration Run Tracking (`migrationLog`)

Every `pnpm run migrate` invocation (single-database or batch) writes to a `migrationLog`
table in the account database — one row per target database (account or project) it
touches, keyed by `runId` + `contextKey` (`'account'` for the static datasource, the
`projectId` for a project database). This is a **run/job ledger**, separate from
`migrationMeta`:

| Table | Lives in | Answers |
|-------|----------|---------|
| `migrationMeta` | Each target database | "Has this patch been applied to *this* database?" — the canonical version state |
| `migrationLog` | Account database | "What happened to *this database* in *this run*?" — status, per-patch detail, timing, error |

Each `migrationLog` row records `status` (`pending`/`running`/`success`/`failed`),
`previousVersion`/`currentVersion`, `totalPatches`/`successCount`/`failedCount`/`skippedCount`,
a `patchResults` array (per-patch version/description/status/duration/error), `duration`,
and a top-level `error` for failures that happen before any patch runs (e.g. a connection
failure). A dry run (`--dry-run`) never writes to `migrationLog` — it's preview-only.

`--resume <runId>` reads the rows for that run, retries every one that isn't `success`
(including a `running` row left behind by a crashed process — safe to retry since
`migrationMeta` is idempotent per patch), and leaves successful databases untouched. No
distributed locking is involved — a single CLI process drives all concurrency for one
invocation, so `migrationLog` writes are just status updates from that process.

`migrationLog` is designed to also back a future platform-admin monitoring view (not yet
built) — it's queryable by `runId`, `status`, and `dataSourceName`.

## Related Documentation

- **[@datacapy/migrate Package](../../../external/datacapy/package/migrate/README.md)** - Generic migration system documentation
- **[@datacapy/migrate Architecture](../../../external/datacapy/package/migrate/docs/architecture/index.md)** - Technical implementation details
- **[@datacapy/migrate Best Practices](../../../external/datacapy/package/migrate/docs/best-practices/index.md)** - Guidelines for writing migrations
- **[Project Databases](./project-databases.md)** - Per-project database implementation
