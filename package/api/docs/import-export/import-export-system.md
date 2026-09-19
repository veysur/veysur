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
  │   └── {imageSetId}/
  │       ├── original.jpg
  │       ├── edited.jpg
  │       └── thumb.jpg
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

- **SurveyResponseEntityHandler** — Survey response export (.json). Export-only; filtered by publicationId.
- **SurveyPublicationEntityHandler** — Composite import/export (.vssp). Bundles `surveyPublication.json` + `surveySnapshotData.json` + `surveySnapshot.json` + `responses/batch-00000N.json` (batched, 1000 responses per file) + language snapshot records + binary image files for answer options. On export, streams each image from S3 into the archive one-by-one. On import, binary images are streamed from the archive to temp S3 keys by the parser, then copied to final destinations before the DB transaction; creates survey (optional), snapshot (with contentHash deduplication), publication, and File records in a single transaction; responses are inserted one batch at a time (O(batch_size) peak memory) with participant resolution and response-ID-collision detection performed inline per batch — each batch is freed from memory after insertion. Section, element, `sectionIds`, and `elementIds` are always assigned fresh IDs on import to prevent collisions.

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
- **VsspFormatHandler** — tar+gz archive format (.vssp). Extends `TarGzFormatHandler`. Archives contain `surveyPublication.json` + `surveySnapshotData.json` + `surveySnapshot.json` + `responses/batch-00000N.json` (1000 responses per batch) + `surveyLanguageSnapshots/` + optional `files/manifest.json` and binary images.
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
3. **Fetch Entity** → EntityHandler.fetchForExport()
4. **Lookup Format** → FormatRegistry.getByFormat(format)
5. **Serialize** → EntityHandler.prepareExportData() → FormatHandler.serialize() → `Readable`
6. **Stream to S3** → ServiceFileTempDownload.createTempDownloadFromStream() — no disk write; hash/size computed inline
7. **Generate URL** → Presigned download URL
8. **Return** → { downloadUrl, filename, expiresAt }

### Import Data Flow

1. **Generate URL** → ServiceImportExport.generateImportUrl()
   - Create File record (fileContext: 'import', status: 'pending')
   - Generate S3 presigned PUT URL
2. **Client Upload** → Direct to S3 (no API involvement)
3. **Process Import** → ServiceImportExport.processImport()
   - Stream from S3 directly through tar+gz parser — no disk writes
   - Hash and byte count computed inline via PassThrough
   - Parse via FormatHandler (JSON in memory; binary → temp S3 keys)
   - Validate via EntityHandler
   - Persist via EntityHandler (images copied from temp S3 keys to final destination)
   - Temp S3 keys cleaned up in finally block
   - Update File record with result

## File Entity Extensions

The **File** entity tracks import operations:

```
File {
  fileContext: 'import' | 'project' | 'survey' | ...

  import?: {
    entityType: 'survey' | 'surveyResponse' | 'surveyPublication' | ...
    format: 'vsst' | 'json' | 'vssp' | ...
    status: 'pending' | 'processing' | 'completed' | 'failed'
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
- **Registries**: `/package/api/src/model/service/core/ImportExport/EntityHandlerRegistry.ts`
- **Entity Handlers**: `/package/api/src/model/service/core/ImportExport/handlers/`
- **Format Handlers**: `/package/api/src/model/service/core/ImportExport/format/`
- **Endpoints**: `/package/api/src/endpoint/import-export.ts`
- **Schema**: `/package/common/src/model/schema/SchemaFile.ts`
