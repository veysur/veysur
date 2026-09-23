# Import/Export Lifecycle

## Import State Transitions

```
[Created]
   ↓
[Pending] ──────────────────────────────────────┐
   ↓                                            │
[Processing]                                    │
   ↓                                            │
┌──┴────┐                                       │
│       │                                       │
▼       ▼                                       ▼
[Completed] [Failed]                      [Auto-Delete]
   ↓         ↓                              (1 hour)
[Ready for Cleanup]
(7 days after processing)
```

### State Descriptions

- **Pending**: Upload URL generated, awaiting S3 upload from client
- **Processing**: Import triggered, file being validated and persisted
- **Completed**: Import successful, entity created
- **Failed**: Validation or persistence error occurred
- **Auto-Delete**: File expires if upload/processing not completed

## Export Workflow

```
1. Validate Request
   ├─ Entity type supported?
   ├─ Format supported by entity?
   └─ User has access to entity?
   ↓
2. Fetch Entity
   ├─ Query database
   ├─ Load relationships (elements, sections, etc.)
   └─ Apply ACL filters
   ↓
3. Serialize + Upload to S3
   ├─ Transform to format structure
   ├─ Stream directly to S3 (no disk write)
   └─ Hash & size computed inline via PassThrough
   ↓
4. Generate Download URL
   ├─ Create presigned URL (6 hour expiration)
   └─ Return to client
```

**Timing**: Export operations complete synchronously within 1-2 seconds for typical surveys.

See: `/package/api/src/model/service/core/ServiceImportExport.ts:export()`

## Import Workflow

### Step 1: Generate Upload URL

```
Client Request
   ↓
Validate Entity Type & Format
   ↓
Create File Record
   ├─ fileContext: 'import'
   ├─ import.status: 'pending'
   ├─ import.entityType: 'survey'
   ├─ import.format: 'vsst'
   ├─ import.options: { force, surveyId? }
   └─ deleted: now + 1 hour
   ↓
Generate S3 Presigned PUT URL
   ↓
Return { uploadUrl, fileId, expiresAt }
```

**Timing**: Completes in <100ms

### Step 2: Client Upload (Direct to S3)

Client uploads directly to S3 using presigned URL. **API server not involved**.

### Step 3: Process Import

```
Client Request
   ↓
Fetch File Record
   ├─ Verify: fileContext='import'
   ├─ Verify: status='pending'
   └─ Verify: not expired
   ↓
Update: status='processing'
   ↓
Stream from S3 (no disk writes)
   ├─ Hash & size computed inline via PassThrough
   └─ Update File record
   ↓
Parse
   ├─ FormatHandler.parse(stream) — JSON in memory; binary → temp S3 keys
   └─ Extract entity data
   ↓
Validate
   ├─ ID Translation (detect collisions)
   ├─ Schema Validation
   └─ Reference Validation
   ↓
┌───────────────────────┐
│ Validation Failed?    │
└────┬──────────────┬───┘
     │              │
    Yes             No
     │              │
     ▼              ▼
 force=true?    Persist
     │              ├─ Start transaction
    No│             ├─ Insert entities
     │              └─ Commit
     ▼              ↓
  Throw Error   Update File
  status='failed'   ├─ status='completed'
                    ├─ import.result
                    └─ deleted=now+7days
                    ↓
                 Return Result
```

**Timing**: Varies by entity size (typically 1-5 seconds for surveys)

See: `/package/api/src/model/service/core/ServiceImportExport.ts:processImport()`

## ID Translation Process

Import files may contain IDs that collide with existing entities. The system automatically detects and translates these.

### Survey (.vsst) imports

Uses `SurveyImportIdTranslator` — checks survey/section/element IDs for collisions and generates new IDs where needed. Translation map included in response: `hasIdTranslations: true`.

See: `/package/api/src/model/service/SurveyExportImport/SurveyImportIdTranslator.ts`

### Survey publication (.vssp) imports

Handled by `VsspImportResolver` (no side effects — pure resolution pass):

`surveyId` is required — a `.vssp` file can only be imported into an existing survey, never used to create one (a publication has no editable template, so a survey created purely from it would open to an empty editor).

| Entity | Strategy |
|---|---|
| Survey | Use provided `surveyId`; resolution fails if it does not exist |
| Snapshot | Dedup by `contentHash` on the target survey; reuse existing or create new |
| Publication | New ID if collision; keep original ID otherwise |
| Sections / Elements | Fresh IDs only when creating a new survey (`createSurvey === true`) |
| Participants | Deduplicated across responses (same `participantId` processed once); matched by email on the target survey — reuse existing or create new with a fresh ID |
| Responses | New ID on collision with an existing response |
| Files (images) | `imageSetId` derived from file hash (first 16 chars) or generated; resurrects soft-deleted records if a matching hash is found |
| Files (`fileUpload` response answers) | Deduped by `(surveyId, hash, fileContext: 'response')`, ignoring `responseId` — reuses an existing `File` if one with matching content already exists anywhere in the target survey; created inline in the per-response persistence loop (see below) since the final `responseId` is only known there |

**S3 uploads happen before the DB transaction** (in `VsspImportPersister`) so the transaction never contains a partial image set. Response-file uploads are the one exception: they happen inside the per-batch response loop (still within the transaction) because each one needs the response's final `_id`, which is only assigned at insert time (a response-ID collision reassigns it to a fresh id).

See: `/package/api/src/model/service/core/ImportExport/handlers/SurveyPublicationEntityHandler/VsspImportResolver.ts`

## Validation & Repair

When `force: false` (default):
- Validation errors throw error, import fails
- Client must fix data and retry

When `force: true`:
- Validation errors trigger auto-repair
- Invalid references removed
- Broken entities discarded
- Repairs/discards reported in result

**Example repairs**:
- Remove element with invalid sectionId
- Remove subquestion with missing parent
- Discard answer option with invalid elementId

See: `/package/api/src/model/service/SurveyExportImport/SurveyImportRepairer.ts`

## File Cleanup Strategy

### Expiration Rules

| Status | Cleanup Delay | Reason |
|--------|---------------|--------|
| Pending (not uploaded) | 1 hour | Abandoned upload |
| Processing | 1 hour | Stuck/failed process |
| Completed | 7 days | Result available for review |
| Failed | 7 days | Error details available |

### Cleanup Mechanism

Files use soft-delete via `deleted` timestamp field:
- Background job periodically hard-deletes expired files
- S3 files deleted when database record removed

See: `/package/common/src/model/constructor/File.ts`

## Edge Cases

### Concurrent Imports

Multiple simultaneous imports of same file prevented:
- Status check ensures only one `processImport()` call succeeds
- Others receive "already processing" error

### Network Failures

- **During S3 upload**: Client retries upload, or generates new URL
- **During processing**: Transaction rolls back, status set to 'failed'
- **After processing**: Result persisted, safe to refetch

### Expired URLs

- **Upload URL expired**: Generate new URL, retry upload
- **Download URL expired**: Request new export
