# Import/Export System Architecture

## Core Concepts

### Registry Pattern

The system uses a **double registry pattern** to decouple entity types from file formats:

```
┌──────────────────────┐
│  ServiceImportExport │ (Generic Orchestration)
└─────────┬────────────┘
          │
    ┌─────┴─────┐
    ▼           ▼
┌────────┐  ┌────────┐
│ Entity │  │ Format │
│Registry│  │Registry│
└────┬───┘  └───┬────┘
     │          │
     ▼          ▼
  Handler    Handler
```

This allows adding new entity types or formats independently without modifying core code.

### Entity Handlers

**EntityHandlerInterface** defines how to import/export a specific entity type:

- **fetchForExport()** - Retrieve entity from database
- **prepareExportData()** - Transform for serialization
- **parseImportData()** - Parse uploaded file
- **validateImport()** - Validate and optionally repair data
- **persistImport()** - Insert entity into database
- **isAsyncEligible()** *(optional)* - Whether a format/direction should run
  off the request through `ServiceDataTransferJob` rather than synchronously,
  see [Async eligibility](#async-eligibility-the-data-transfer-job-pipeline)

**Current implementations**:

- **SurveyEntityHandler** — Survey import/export (.vsst). Exports live survey structure + embedded answer-option images. On export, streams each image from S3 into the archive. On import, binary images are streamed from the archive to temp S3 keys by the parser, then copied to final destinations before the DB transaction; creates survey, sections, elements, and File records in a single transaction. ID collision detection and optional force-repair via `SurveyImportIdTranslator` / `SurveyImportRepairer`.

  Implemented as a thin orchestrator delegating to four focused collaborators:

  ```
  SurveyEntityHandler (orchestrator)
  ├── VsstExportCollector  — fetch survey + image metadata from repos
  ├── VsstImportParser     — validate archive structure; extract survey.json + manifest
  ├── VsstImportResolver   — ID translation, validation, file resolution → VsstResolvedContext
  └── VsstImportPersister  — copy images from temp S3 keys, persist everything in one transaction
  ```

  See: `/package/api/src/model/service/core/ImportExport/handlers/SurveyEntityHandler/`

  **VSST archive structure**:

  ```
  survey-template.vsst (tar+gz)
  ├── survey.json               { version: '2.0', survey, sections, elements }
  ├── surveyLanguages/
  │   └── {languageCode}.json  { languageCode, text }
  ├── participantAttributes/
  │   └── {name}.json          { name, required, example, languages } — survey-tier participant attribute definitions
  ├── templates/
  │   └── {type}-{lang}.json   { type, lang, subject, body } — survey-tier email templates only
  └── files/
      ├── manifest.json        { version, files: [...] }
      └── {imageSetId}/
          ├── original.jpg
          ├── edited.jpg
          └── thumb.jpg
  ```

- **SurveyFullEntityHandler** — Combined survey + all publications import/export (.vssa flat tar+gz). Exports all data into a flat native hierarchy with structural deduplication — images stored once in `files/`, snapshot data stored once per unique snapshot in `snapshotData/`. On import, restores the survey first then synthesizes a `VsspParsedBundle` per publication using the shared `parsedData` and per-snapshot data, then resolves and persists each publication linked to the newly created survey.

  ```
  SurveyFullEntityHandler (orchestrator)
  ├── VssaExportCollector  — collect survey + pub data via child handler fetchForExport();
  │                          deduplicates images and snapshot data natively in flat structure
  └── VssaImportParser     — parse flat tar+gz stream; return typed VssaParsedData with shared parsedData
  ```

  See: `/package/api/src/model/service/core/ImportExport/handlers/SurveyFullEntityHandler/`

  **VSSA archive structure**:

  ```
  survey-full.vssa (flat tar+gz)
  ├── survey.json                     ← { version: '2.0', survey, sections, elements }
  ├── surveyLanguages/
  │   └── {languageCode}.json         ← live language records
  ├── participantAttributes/
  │   └── {name}.json                 ← survey-tier participant attribute definitions
  ├── templates/
  │   └── {type}-{lang}.json          ← survey-tier email templates only
  ├── files/
  │   ├── manifest.json               ← shared file manifest (all images, deduplicated)
  │   ├── {imageSetId}/
  │   │   ├── original.jpg
  │   │   ├── edited.jpg
  │   │   └── thumb.jpg
  │   ├── response-manifest.json      ← fileUpload-question answer files (all publications, concatenated)
  │   └── response/
  │       └── {fileId}{ext}           ← one file per bundled fileUpload answer
  ├── snapshots/
  │   └── {snapshotId}.json           ← snapshot metadata (one per unique snapshot)
  ├── snapshotData/
  │   └── {snapshotId}.json           ← snapshot data (one per unique snapshot)
  ├── surveyLanguageSnapshots/
  │   └── {snapshotId}/
  │       └── {languageCode}.json     ← frozen language content per snapshot
  ├── publications/
  │   └── {pubId}.json                ← publication record
  └── responses/
      └── {pubId}/
          └── batch-000001.json       ← response batch (1000 responses per file)
  ```

- **SurveyResponseEntityHandler** — Survey response export (.json/.csv). Export-only; filtered by publicationId. CSV export/import degrades `fileUpload`-question answers: export writes the referenced fileIds comma-joined (never the file bytes — CSV has no binary channel), and import silently skips a `fileUpload` column rather than writing a bogus answer from a bare id string. Only `.vssp`/`.vssa` import restores actual files. See [response-csv.md](response-csv.md).
- **SurveyPublicationEntityHandler** — Composite import/export (.vssp). Bundles `surveyPublication.json` + `surveySnapshotData.json` + `surveySnapshot.json` + `responses/batch-00000N.json` (batched, 1000 responses per file) + language snapshot records + binary image files for answer options + binary files for `fileUpload`-question answers. On export, streams each image (and each response file) from S3 into the archive one-by-one; a `MAX_RESPONSE_EXPORT_FILE_COUNT`/`MAX_RESPONSE_EXPORT_TOTAL_SIZE` guardrail (see `handlers/util/responseFileExportLimits.ts`) rejects an export whose bundled response files would be too large for a single archive (checked per-publication here, and again across the combined archive in `SurveyFullEntityHandler`/`VssaExportCollector` for `.vssa`). `.vssp`/`.vssa` exports estimate size from response count, see [Async eligibility](#async-eligibility-the-data-transfer-job-pipeline) below. On import, binary images and response files are streamed from the archive to temp S3 keys by the parser, then copied to final destinations before the DB transaction; creates survey (optional), snapshot (with contentHash deduplication), publication, and File records in a single transaction; responses are inserted one batch at a time (O(batch_size) peak memory) with participant resolution and response-ID-collision detection performed inline per batch — each batch is freed from memory after insertion. Section, element, `sectionIds`, and `elementIds` are always assigned fresh IDs on import to prevent collisions.

  Response files are handled as a parallel, additive pipeline kept deliberately separate from the answer-option image-set machinery (`FileResolution`/`imageSetIdMap`), since a response file has none of the image-set model's concepts (no `imageSetId`/`imageVariant`/`answerOptionId`). Manifest entries live in their own `files/response-manifest.json` (type `ResponseFileManifestEntry`, see `SurveyPublicationEntityHandler/types.ts`) rather than being folded into the shared `EntityEmbeddedFileManifestEntry` list. On import, dedup is scoped to `(surveyId, hash, fileContext: 'response')` — deliberately broader than the per-response scoping `ServiceFileUpload` uses at normal upload time — so re-importing the same archive (or a file whose bytes match one already imported for a different response in the same survey) reuses the existing `File` record instead of creating a duplicate.

  Implemented as a thin orchestrator (~50 lines) delegating to five focused collaborators:

  ```
  SurveyPublicationEntityHandler (orchestrator)
  ├── VsspExportCollector  — fetch publication, snapshot, responses, image metadata from repos
  ├── VsspImportParser     — validate archive structure; extract JSON files into VsspParsedBundle
  ├── VsspImportResolver   — resolve survey/snapshot/publication IDs without side effects → ResolvedImportContext
  ├── VsspImportPersister  — copy images from temp S3 keys; persist in one transaction; resolves
  │                          participants + response-ID collisions per batch; frees each batch after insert;
  │                          always forces the persisted publication into a stopped state (preserving an
  │                          already-stopped timestamp, otherwise stamping `stopped = now`) so imports never
  │                          activate a publication — matches the "one active publication per survey" invariant
  │                          enforced by `ServiceSurveyPublication.publish()`/`republish()`
  └── SnapshotDataRemapper — deep-clone snapshot data; remap survey/section/element/image IDs
  ```

  See: `/package/api/src/model/service/core/ImportExport/handlers/SurveyPublicationEntityHandler/`

See: `/package/api/src/model/service/core/ImportExport/EntityHandlerInterface.ts`

### Format Handlers

**FormatHandlerInterface** defines serialization/deserialization for a file format:

- **serialize()** - Convert entity to format-specific structure
- **parse()** - Convert file path to entity structure
- **getFilename()** - Generate download filename
- **getMimeType()** - Content type for HTTP responses

**Current implementations**:

- **VsstFormatHandler** — tar+gz archive format (.vsst). Survey template with embedded images. Extends `TarGzFormatHandler`.
- **JsonFormatHandler** — Generic JSON serialization (.json)
- **VsspFormatHandler** — tar+gz archive format (.vssp). Extends `TarGzFormatHandler`. Archives contain `surveyPublication.json` + `surveySnapshotData.json` + `surveySnapshot.json` + `responses/batch-00000N.json` (1000 responses per batch) + `surveyLanguageSnapshots/` + optional `files/manifest.json` and binary images + optional `files/response-manifest.json` and binary `fileUpload`-question answer files.
- **VssaFormatHandler** — tar+gz archive format (.vssa). Extends `TarGzFormatHandler`. Flat archive (no nested archives); all survey and publication data in a single streaming pass.
- **TarGzFormatHandler** — Abstract base class providing streaming tar+gz serialize/parse. Both import and export are zero-disk: export returns a `Readable` stream piped directly to S3; import streams through the tar parser with JSON in memory and binary entries piped to temp S3 keys. See: `/package/api/src/model/service/core/ImportExport/format/TarGzFormatHandler.ts`, `ArchiveReader.ts`

See: `/package/api/src/model/service/core/ImportExport/format/FormatHandlerInterface.ts`

## Component Relationships

```
┌─────────────────────────────────────────────────────┐
│ API Endpoints                                       │
│   POST /api/export/:entityType/:id/:format          │
│   POST /api/import/url/:entityType                  │
│   POST /api/import/process/:fileId                  │
│   GET  /api/import/status/:fileId    (async import) │
│   GET  /api/data-transfer-job/status/:jobId (export) │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│ ServiceImportExport                                 │
│   • Validates entity types and formats              │
│   • Manages S3 operations                           │
│   • Tracks import status via File entities          │
│   • Delegates to handlers                           │
└──────┬──────────────────────────┬───────────────────┘
       │                          │
       ▼                          ▼
┌──────────────┐          ┌──────────────┐
│ Entity       │          │ Format       │
│ Handler      │─────────▶│ Handler      │
│              │          │              │
│ • Survey          │          │ • VSST        │
│ • SurveyResponse  │          │ • JSON       │
│ • SurveyPublication│          │ • VSSP        │
└──────────────┘          └──────────────┘
```

## Data Flow Patterns

### Export Data Flow

1. **API Request** → ServiceImportExport.export()
2. **Lookup Handler** → EntityHandlerRegistry.get(entityType)
3. **Async-eligible?** (`handler.isAsyncEligible?.('export', format)`)
   - **No** → continue inline via `compileExport()` (steps 4-8 below)
   - **Yes** → `ServiceDataTransferJob.enqueueExport()`, return `{ async: true, jobId, status }`
     immediately; `processQueue()` later runs `compileExport()` off-request. `enqueueExport()`
     also creates a related `Notification` (`ServiceNotification.create()`), which
     `processOne()` updates to `success`/`error` on completion/failure
     (`ServiceNotification.updateForDataTransferJob()`) — the notification bell/panel polls
     `GET /notification/list`, not the job endpoint directly. See
     [Notifications](#notifications) below.
4. **Fetch Entity** → EntityHandler.fetchForExport()
5. **Lookup Format** → FormatRegistry.getByFormat(format)
6. **Serialize** → EntityHandler.prepareExportData() → FormatHandler.serialize() → `Readable`
7. **Stream to S3** → ServiceFileTempDownload.createTempDownloadFromStream() — no disk write; hash/size computed inline
8. **Generate URL** → Presigned download URL
9. **Return** → { downloadUrl, filename, expiresAt }

### Import Data Flow

1. **Generate URL** → ServiceImportExport.generateImportUrl()
   - Create File record (fileContext: 'import', status: 'pending')
   - Generate S3 presigned PUT URL
2. **Client Upload** → Direct to S3 (no API involvement)
3. **Process Import** → ServiceImportExport.processImport()
   - Look up the entity handler for `file.import.entityType`
   - **Async-eligible?** (`handler.isAsyncEligible?.('import', file.import.format)`)
     - **No** → continue inline via `runImport()` (steps below)
     - **Yes** → mark `File.import.status = 'queued'`, `ServiceDataTransferJob.enqueueImport()`,
       return `{ async: true, jobId, status }` immediately; `processQueue()` later runs
       `runImport()` off-request and the client polls `GET /import-export/import/status/:fileId`
       (not the generic `GET /file/:fileId`, which 404s pre-completion, see below)
   - **runImport()**:
     - Stream from S3 directly through tar+gz parser — no disk writes
     - Hash and byte count computed inline via PassThrough
     - Parse via FormatHandler (JSON in memory; binary → temp S3 keys)
     - Validate via EntityHandler
     - Persist via EntityHandler (images copied from temp S3 keys to final destination)
     - Temp S3 keys cleaned up in finally block
     - Update File record with result

### Async eligibility: the Data Transfer Job pipeline

The sync-vs-async decision is size-based, not format-based: an import/export whose estimated
size exceeds `ASYNC_TRANSFER_SIZE_THRESHOLD_BYTES` (1MB, see
`handlers/util/asyncTransferSizeThreshold.ts`) runs off the request via
**ServiceDataTransferJob** instead of inline:

- **Export**: `EntityHandlerInterface.estimateExportSize()` (optional) gives a cheap estimate:
  - `SurveyEntityHandler` (`.vsst`) has no response data, so its `collect()` fetch is already
    cheap (survey + embedded answer-option images + templates/attributes, nothing scaling
    with response count) — `estimateExportSize` just runs it and sums the actual embedded
    image sizes.
  - `SurveyPublicationEntityHandler` (`.vssp`) sums two components per publication: a response
    count times `ESTIMATED_BYTES_PER_RESPONSE` (an exact response-file figure would cost almost
    as much as doing the export — it requires walking every response's answers to find embedded
    files, the same work `VsspExportCollector.collect()` already does), **plus** the actual
    embedded answer-option image size for that publication's snapshot
    (`VsspExportCollector.estimateSize()`, reusing the same image-set lookup `collect()` uses),
    since that's cheap regardless of response volume — bounded by the number of images in the
    survey, not by responses. With no `publicationId` (used by `SurveyFullEntityHandler` below),
    it sums this across every publication for the survey.
  - `SurveyFullEntityHandler` (`.vssa`) sums **two independent sources**, matching
    `VssaExportCollector.collect()`'s own structure: `SurveyEntityHandler.estimateExportSize()`
    for the *live* survey's embedded images (`VssaExportCollector.collect()` always starts from
    `surveyHandler.fetchForExport()`, unconditionally — even a survey with zero publications
    still bundles its own answer-option images) **plus**
    `SurveyPublicationEntityHandler.estimateExportSize()` (no `publicationId`) for every
    publication's own snapshot images and responses. The two aren't deduped against each other;
    an overestimate only risks queueing something that could have run inline, which is the safe
    direction to err in. Missing the live-survey component entirely was the cause of a real bug:
    an unpublished survey (zero publications) with large answer-option images estimated as 0 and
    ran a multi-megabyte `.vssa` export inline.
  - `SurveyResponseEntityHandler` (`.json`/`.csv`) has no embedded images, only the
    response-count component.
- **Import**: no handler method needed — decided from the real uploaded object's size in S3
  (`common/getObjectSize()`), since the file is already fully uploaded by the time
  `processImport()` runs.

- **`DataTransferJob`** (`/package/common/src/model/schema/SchemaDataTransferJob.ts`) is a
  cross-project queue-pointer row: `direction: 'import' | 'export'`, `status: 'pending' |
  'processing' | 'completed' | 'failed'`, plus `entityType`/`entityId`/`format`/`options`/
  `resultFileId` (export) or `sourceFileId` (import). It uses the **default (account)
  datasource, not project-scoped**: `File` and the survey/publication data itself live in
  each project's own datasource, which can't be queried across projects in one call, the same
  reason `RepoEmail` (mail queue) isn't project-scoped either.
- **Import's detailed status/result is never duplicated onto the job row**: it stays on the
  existing `File.import.status`/`import.result` fields (see [File Entity Extensions](#file-entity-extensions)
  below); the job row exists purely so `processQueue()` can find due imports across every
  project in one query.
- A seeded `Task` (`task: 'dataTransferJob', action: 'processQueue'`, `concurrency: 1`, every
  15s) drains due jobs. No `RepoTaskLock` is needed: `concurrency: 1` already prevents
  overlapping runs, same as the mail queue (see `docs/mail-queue-pacing.md`,
  `docs/task-manager.md`).
- `processQueue()` calls `ServiceImportExport.compileExport()`/`.runImport()` directly, never
  `.export()`/`.processImport()`, which would re-check the size threshold and enqueue the job
  again.
- **Worker authorization**: the worker has no live request/JWT. It reconstructs a minimal
  `aclContext` from the job's own `projectId`/`requestedByUserId` rather than storing a
  credential: a job row only exists because an authorized (`projectAdmin`) request created
  it, so that authorization doesn't need re-checking at process time.

**Active-job reuse (export and import)**: `enqueueExport()` looks up still-active
(pending/processing) jobs for the same `projectId`/`requestedByUserId`/`entityType`/
`entityId`/`format` (`RepoDataTransferJob.findActiveMatch()`), then filters to an exact
options match (`optionsEqual()`, a sorted-key JSON comparison). A match is returned as-is
(`{ jobId, status, alreadyQueued: true }`) instead of creating a duplicate row.
`enqueueImport()` does the equivalent via `findActiveImportJob()`, but matches on
**`sourceFileHash`** (the uploaded content's hash) rather than `entityId`, since an import
job has no entity yet, see below.

**Import content-hash dedup**: the client computes a hash of the file being imported
(`calculateFileHash` in `useImportFlow`, app side) and sends it as `sourceFileHash`.
`findActiveImportJob()` returns `null` immediately if no hash was sent (no accidental
false-positive dedup), otherwise matches an active job with the same hash via
`RepoDataTransferJob.findActiveImportMatch()`. This is checked in two places: once in
`generateImportUrl()` (short-circuits before the client even uploads) and again in
`enqueueImport()` (belt-and-suspenders against the same race `enqueueExport()` tolerates).
It is a distinct mechanism from the same-`fileId` rejection in
[Import Data Flow](#import-data-flow) above: content-hash dedup catches two *different*
uploads of identical bytes, not just a second `processImport()` call against the same
already-uploaded file.

**Job labels**: both `enqueueExport()`/`enqueueImport()` and `processOne()` build a
human-readable label via `buildJobLabel()`: the job's own `label` if one was passed,
otherwise `Export (.vsst)` / `Import (.vssp)` etc. (`${direction === 'export' ? 'Export' :
'Import'} (.${format})`). This label is shared as-is with the related Notification's
`title`, so the bell/panel and any job-status API response show the same text.

**Deleting jobs**: `deleteJob()` is the admin-facing manual delete - rejects a job that
isn't settled (`status` still `pending`/`processing`) and checks the caller owns the job
(matching `projectId` and `requestedByUserId`). It never touches the job's `resultFileId`
File, which has its own independent expiry (`ServiceFileTempDownload`). `deleteSettledJob()`
is the internal counterpart used only by `ServiceNotification.cleanupOld()`: no ACL check,
and silently no-ops (rather than throwing) on a missing or still-active job, since it's only
ever called for a job a settled notification already points to.

**Stale-job reaping**: `processQueue()` calls `reapStale()` before draining the pending
queue on every tick. A job stuck `pending` (queue processor was down) or `processing` (API
crashed mid-`processOne()`) for longer than `dataTransfer.staleAfterMs` (config, default 15
minutes) is marked `failed` rather than deleted. Marking it failed (not deleting it) also
drops it out of the active-job dedup match set (`findActiveMatch()`/
`findActiveImportMatch()` both filter to `pending`/`processing`), so the next request
creates a fresh job instead of latching onto a dead one.

See: `/package/api/src/model/service/core/ServiceDataTransferJob.ts`

### Notifications

`DataTransferJob` tracks job state only - it does not surface anything to the user directly.
**`Notification`** (`/package/common/src/model/schema/SchemaNotification.ts`) is a related,
generic entity: `enqueueExport()`/`enqueueImport()` create one (`level: 'info'`) via
`ServiceNotification.create()`, and `processOne()` updates it to `level: 'success'`/`'error'`
via `ServiceNotification.updateForDataTransferJob()` as the job settles. `Notification.type`
discriminates the notification's source; each type gets its own nullable FK
(`dataTransferJobId` today) with its own `belongsToOne` relation on `RepoNotification` - mzen-om
relations bind to a single repo each, so there is no single polymorphic `relatedEntityId`.

The frontend notification bell/panel (`DataTransferNotificationBell`) polls
`GET /notification/list`, not the job endpoint - `ServiceNotification.list()` populates the
`dataTransferJob` relation and resolves the download URL server-side in the same call. Dismissing
a notification (`ServiceNotification.dismiss()`) never deletes the underlying `DataTransferJob`
row; that row is deleted as a side effect of `ServiceNotification.cleanupOld()` once its
notification has been read/dismissed and aged out (a seeded `task: 'notification', action:
'cleanupOld'` Task) - `DataTransferJob` has no cleanup task of its own.

See: `/package/api/src/model/service/core/ServiceNotification.ts`

### Notification tray (frontend)

`DataTransferNotificationBell` (`/package/app/src/appAdmin/component/DataTransferNotification/`)
and its hooks are the frontend counterpart to the notification backend above:

- **`useNotifications()`** — the bell/panel's data source: lists the calling admin's
  notifications via `getNotificationApi().listNotifications()` and polls every 15s
  (`POLL_INTERVAL_MS`) only while at least one listed notification's
  `dataTransferJobStatus` is still `pending`/`processing` — otherwise polling stops. It also
  fires a one-off toast the first time a given notification is observed moving to a settled
  `level` (`'success'`/`'error'`), independent of the persistent panel record, which never
  disappears just because a toast was missed.
- **`useDismissNotification()`** — calls `dismiss()` (`DELETE /notification/:notificationId`)
  and optimistically removes the row from the TanStack Query cache in `onMutate` (rolling
  back on failure) so the panel updates instantly rather than waiting for the round trip.
  Never touches the related `DataTransferJob` row — see
  [Notifications](#notifications) above for who owns that.
- **`useMarkNotificationRead()`** — calls `markRead()` for each unread notification visible
  when the panel opens; the server's `status` field is the source of truth for the unread
  badge count (supersedes an earlier localStorage-based approach).

On the import side, **`useImportFlow()`**
(`/package/app/src/appAdmin/component/ImportExport/hook/useImportFlow.ts`) is the shared
mutation hook behind every survey import entry point (`useImportSurvey`,
`useImportSurveyFull`, `useImportSurveyPublication`, `useImportSurveyResponse`): it hashes
the file (`calculateFileHash`), calls `generateImportUrl()` with that hash as
`sourceFileHash`, short-circuits to `useResolveImportResult()` without uploading at all when
the response carries `alreadyQueued: true` (see
[Async eligibility](#async-eligibility-the-data-transfer-job-pipeline) above), otherwise
uploads to S3 and calls `processImport()`. Each import hook wrapper only supplies its own
`entityType`/`format`/`buildOptions` and which queries to invalidate on success.

## File Entity Extensions

The **File** entity tracks import operations:

```
File {
  fileContext: 'import' | 'project' | 'survey' | ...

  import?: {
    entityType: 'survey' | 'surveyResponse' | 'surveyPublication' | ...
    format: 'vsst' | 'json' | 'vssp' | ...
    status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed'
    options: { force: boolean, surveyId?: string }
    result?: {
      success: boolean
      entityId: string
      hasIdTranslations: boolean
      repairs: Array<...>
      error?: string
    }
  }
}
```

`queued` (between `pending` and `processing`) means an async-eligible import has been handed
to `ServiceDataTransferJob` and is waiting for `processQueue()` to pick it up; `pending`
alone doesn't distinguish "not yet processed" from "already enqueued," which matters for
rejecting a duplicate `processImport()` call on the same file.

See: `/package/common/src/model/schema/SchemaFile.ts`

## Extensibility

### Adding Entity Types

To add a new entity type (e.g., participants):

1. Create handler implementing **EntityHandlerInterface**
2. Register in ServiceImportExport.init()
3. Endpoints automatically support new type

No endpoint modifications needed.

See example: `/package/api/src/model/service/core/ImportExport/handlers/SurveyEntityHandler.ts`

### Adding Formats

To add a new format (e.g., CSV):

1. Create handler implementing **FormatHandlerInterface**
2. Register in FormatRegistry
3. Update entity handler's getSupportedFormats()

Format becomes immediately available for all supporting entity types.

See example: `/package/api/src/model/service/core/ImportExport/format/VsstFormatHandler.ts`

## Implementation Files

- **Orchestration**: `/package/api/src/model/service/core/ServiceImportExport.ts`
- **Async job queue/worker**: `/package/api/src/model/service/core/ServiceDataTransferJob.ts`,
  `/package/api/src/model/repo/RepoDataTransferJob.ts`,
  `/package/common/src/model/schema/SchemaDataTransferJob.ts`
- **Registries**: `/package/api/src/model/service/core/ImportExport/EntityHandlerRegistry.ts`
- **Entity Handlers**: `/package/api/src/model/service/core/ImportExport/handlers/`
- **Format Handlers**: `/package/api/src/model/service/core/ImportExport/format/`
- **Endpoints**: `/package/api/src/endpoint/core/import-export.ts`,
  `/package/api/src/endpoint/core/data-transfer-job.ts`
- **Schema**: `/package/common/src/model/schema/SchemaFile.ts`
