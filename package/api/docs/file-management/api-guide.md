# API Guide

A practical guide for developers working with the file management system.

## Client Upload

### Quick Start

```typescript
import { uploadFile } from 'common/uploadFile'

// Project-level file
await uploadFile(apiClient, projectId, file)

// Survey file with progress tracking
await uploadFile(apiClient, projectId, file, {
  surveyId: 'survey_123',
  fileContext: 'survey',
  onProgress: (p) => console.log(`${p.percentage}%`)
})

// Response file (participant upload)
await uploadFile(apiClient, projectId, file, {
  surveyId: 'survey_123',
  responseId: 'response_456',
  fileContext: 'response'
})
```

### Upload Flow

```
[Client] → [Request URL] → [POST file to API endpoint] → [Confirm] → [File Ready]
              ↓                       ↓                       ↓
         [Check Hash]         [Verify HMAC token]       [Verify exists]
              ↓                       ↓
      [Dedup or New]          [adaptor.putObject()]
```

The `uploadFile()` utility handles:
- SHA256 hash calculation
- Deduplication check (reuses existing files in same context)
- HMAC-signed upload URL → POST file body to API endpoint
- Upload confirmation and verification
- Progress tracking

## Image Set Upload

An image set is a group of related file variants (e.g. original, edited, thumb) stored under a shared `imageSetId`. The `imageSetId` is the SHA256 hash of the edited blob, computed client-side before upload — identical edited content always maps to the same `imageSetId`. Each variant is uploaded separately via the same `POST /file/upload-url` endpoint, passing `imageSetId` and `imageVariant` in the request body.

### Flow

```
POST /file/upload-url { imageSetId, imageVariant, surveyId, fileContext, ... }
→ Server creates file record, marks uploaded immediately, returns { fileId, uploadUrl, filePath }
PUT {uploadUrl} (S3)
```

Repeat for each variant. Callers decide which fileId/filePath to retain for their own reference purposes.

### Key differences from standard upload

- For the `edited` variant, pass a SHA256 `fileHash`. If a match is found (same hash + surveyId + fileContext), server returns `existingFile: true, uploadUrl: null` and the existing `filePath` — skip all 3 S3 uploads and use the returned paths directly. Soft-deleted matches are resurrected automatically. For `original` and `thumb`, pass `fileHash: ''`.
- No confirm step — server marks `uploaded` on URL request
- Survey ref added automatically to the `edited` variant when surveyId is provided
- Re-uploading to an existing imageSetId + imageVariant returns the existing fileId + a fresh URL

### Delete

```
DELETE /file/image-set { imageSetId }
→ Soft-deletes all file records with that imageSetId immediately
→ S3 objects hard-deleted by background job after 1 month
```

## File References

### What They Do

References prevent deletion of files that are still in use by:
- **Surveys** (editing state) - Files used in survey questions/answer options
- **Snapshots** (published state) - Files in immutable published snapshots

### How It Works

1. **Upload file** → Survey reference added automatically
2. **Publish survey** → Snapshot reference added
3. **Remove from UI** → System auto-removes survey reference if file is no longer used
4. **Try to delete** → Blocked if snapshot reference exists
5. **Delete snapshot** → Snapshot reference removed, file can now be deleted

**Example Flow**:
```
Upload logo.png to Survey A
  refs: [{ type: 'survey', id: 'survey_a' }]
    ↓
Publish Survey A
  refs: [{ type: 'survey', id: 'survey_a' }, { type: 'surveySnapshot', id: 'snap_1' }]
    ↓
Delete answer option in UI (removes logo from question)
  System checks: File still used? No → Remove survey ref
  refs: [{ type: 'surveySnapshot', id: 'snap_1' }]
  Try delete → BLOCKED (snapshot ref exists)
    ↓
Delete snapshot
  Remove snapshot ref → refs: []
  Try delete → SUCCESS (soft deleted)
```

## Common Operations

### List Files

```typescript
// All project files
GET /api/file/?page=1&perPage=50

// Survey files
GET /api/file/survey/:surveyId

// Response files
GET /api/file/survey/:surveyId/response/:responseId
```

### Delete Files

```typescript
// Soft delete (recoverable)
DELETE /api/file/:fileId
// Marks file as deleted, preserves S3 object
// Throws error if file has references

// Hard delete (permanent cleanup)
DELETE /api/file/hard/P1M
// Permanently deletes files soft-deleted more than 1 month ago

DELETE /api/file/hard/P1D?fileContext=temp
// Clean up temp files expired more than 1 day ago
```

**Duration formats**:
- ISO 8601: `P1D` (1 day), `P7D` (7 days), `PT1H` (1 hour), `P1M` (1 month)
- ASP.NET: `1.00:00:00` (1 day), `7.00:00:00` (7 days)

### Temp Downloads (Server-Generated Files)

```typescript
// Create temporary download (survey export, report, etc.)
const result = await serviceFile.createTempDownload({
  projectId,
  filename: 'export.json',
  buffer,
  mimeType: 'application/json',
  expirationHours: 6  // File expires in 6 hours
})

// Returns:
// {
//   fileId: 'file_temp_123',
//   downloadUrl: 'https://...veysur-files/proj_123/export_abc123.json',
//   expiresAt: '2025-12-24T18:00:00.000Z',
//   isExisting: false  // true if reused existing temp file
// }
```

**Cleanup**: Temp file cleanup is **NOT automatic**. Schedule regular cleanup:

```bash
# Cron job: Clean up temp files daily
0 2 * * * curl -X DELETE https://api.veysur.com/api/file/hard/P1D?fileContext=temp \
  -H "X-Project-Id: proj_123"
```

## Configuration

### Storage Config

Environment variables in `package/api/src/config/default.ts`:

**Backend:**
- `API_S3_TYPE` - `local` (a volume) or `s3` (S3-compatible, e.g. Garage)
- `API_S3_ENDPOINT` - custom S3 endpoint URL (required for Garage)
- `API_S3_FORCE_PATH_STYLE` - `true` for path-style addressing (required for Garage)

**Bucket Configuration:**
- `API_S3_PUBLIC_BUCKET` - Public bucket name (default: `veysur-files`)
- `API_S3_PRIVATE_BUCKET` - Private bucket name (default: `veysur-private`)

**Local mode (`API_S3_TYPE=local`):**
- `API_S3_LOCAL_PATH` - Filesystem path for file storage (default: `/data/files`)
- `API_S3_LOCAL_SECRET` *(secret)* - HMAC key for upload + download tokens (min 32 chars)
- `API_S3_PUBLIC_BASE_URL` - Public base URL for file + upload URLs (e.g. `https://veysur.local`)

**S3 mode (`API_S3_TYPE=s3`):**
- `API_S3_REGION` - AWS region (default: `us-east-1`)
- `API_S3_ACCESS_KEY_ID` *(secret)* - AWS access key
- `API_S3_SECRET_ACCESS_KEY` *(secret)* - AWS secret key
- `API_S3_LOCAL_SECRET` *(secret)* - HMAC key for upload tokens (still required)
- `API_S3_PUBLIC_BASE_URL` - Public base URL for upload endpoint

**Other:**
- `API_S3_MAX_UPLOAD_SIZE` - Maximum upload size in bytes (default: `52428800` = 50 MB)

**Note**: S3 configuration is global. All projects share the same storage settings.

## Quick Troubleshooting

**Upload fails with "File size exceeds maximum"**
- Check global max upload size: `API_S3_MAX_UPLOAD_SIZE` environment variable (default: 50 MB)
- Update by changing the environment variable and restarting the API server

**Presigned URL expired**
- URLs valid for 15 minutes
- Generate new URL if upload takes longer

**File not accessible via proxy URL**
- Verify nginx is routing `/veysur-files/*` and `/veysur-private/*` to `api_backend/storage/...`
- Ensure bucket name uses correct prefix (`veysur-files` for public, `veysur-private` for private)
- In local mode: check the API pod has the file storage PVC mounted at `/data/files`
- Verify file's `bucketType` matches the URL path used

**Deduplication not working**
- Verify SHA256 hash is exactly 64-character hex string
- Files must be in same context (same surveyId/responseId/fileContext)

## Security

- All `/file/*` operations require `projectAdmin` role
- Project isolation enforced by routing to the project's own database (`X-Project-Id` → `DataSourceContext`) — the `File` collection has no `projectId` field
- File URLs are public once uploaded (nginx doesn't check auth)

### Participant-writable exception: `fileUpload` question answers

`/survey-participant-file/*` (`ServiceSurveyParticipantFile`) is the one file-upload path
open to the `participant` role, for a `fileUpload` question's answer. It never trusts a
client-supplied `surveyId`/`responseId`/`projectId` — every scoping identifier is taken
from `aclContext`, which the participant ACL role assessor populates from the verified
participant JWT (mirroring `ServiceSurveyParticipantResponse`). The service:

- Resolves the caller's own in-progress response by `(surveyId, snapshotId,
  participantId | sessionId)` from the JWT — never by a client-passed `responseId` — and
  requires it already exist (created by a prior `saveSurveyParticipantResponse` call).
- Loads the target question's `fileUploadOptions` attribute (`maxFileSize`,
  `allowedMimeTypes`, `maxFileCount`) from the survey snapshot and enforces them
  server-side, in addition to `ServiceFileUpload`'s project storage quota check.
- On confirm, re-verifies the file belongs to the caller's own response (looked up by
  `fileId` → `file.responseId` → a response query scoped by the JWT's own identity) before
  delegating to `ServiceFileUpload.confirmUpload`, so a participant can never confirm (and
  thereby reference) a file uploaded against someone else's response even by guessing a
  `fileId`.

See `/package/api/src/model/service/core/ServiceSurveyParticipantFile.ts`.
- S3 credentials marked as private in schema
- Use presigned URLs for all client-side operations