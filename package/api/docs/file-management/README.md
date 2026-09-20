<!-- cspell:ignore surv resp -->
# File Management System

The Veysur platform uses an S3-based file management system that provides direct client-to-S3 uploads via presigned URLs, context-based storage organization (project/survey/response/temp), content deduplication within contexts, and a two-stage deletion process (soft delete → hard delete) with file resurrection capability. Files are organized hierarchically and accessed through an Nginx proxy that decouples public URLs from the underlying S3 provider.

## Storage Architecture

The system uses the `s3-adaptor` library which provides a **unified local/S3 backend** — no separate storage service pod is needed.

**Backends** (configured via `API_S3_TYPE`):
- **`local`** (the self-hosted default): stores files on a volume at `API_S3_LOCAL_PATH` (`/data/files`, the `veysur-files` Docker volume). Files are served by the API's built-in Express middleware at `/storage/:bucket/*`, proxied through nginx.
- **`s3`**: stores files in an S3-compatible store using `API_S3_ACCESS_KEY_ID`/`API_S3_SECRET_ACCESS_KEY`. Set `API_S3_ENDPOINT` and `API_S3_FORCE_PATH_STYLE=true` for path-style stores such as Garage.

**Two logical buckets** separate file access levels:
- **Public Bucket** (`veysur-files`) — General file uploads, served without token
- **Private Bucket** (`veysur-private`) — Sensitive files (import/export), require HMAC token

**Upload flow** (s3 mode): Client requests a presigned URL → API generates a presigned S3 PUT URL → Client `PUT`s file body directly to the presigned URL → Garage/S3 stores the object.

**Upload flow** (local mode): Client requests a signed URL → API generates HMAC token → Client `PUT`s file body to `/api/file/upload/:bucket/:key?token=...` → API verifies token and calls `adaptor.putObject()`.

## File Lifecycle

```
[Upload] → [Active] → [Soft Delete] → [Hard Delete]
              ↓            ↓
          [In Use]    [Resurrected]
              ↓
     [Referenced by]
   [Survey/Snapshot]
```

**States**:
- **Active** - File uploaded and ready to use
- **Soft Deleted** - Marked as deleted, S3 preserved, recoverable
- **Hard Deleted** - Permanently removed from S3 and database
- **Resurrected** - Re-uploading soft-deleted file reuses existing S3 object

## Context Hierarchy

```
Project (proj_123/)
  ├── Project Files (proj_123/logo_abc123.png)
  ├── Survey A (proj_123/survey/surv_a/)
  │     ├── Survey Files (surv_a/doc_def456.pdf)
  │     └── Response 1 (surv_a/response/resp_1/resume_ghi789.pdf)
  ├── Survey B (proj_123/survey/surv_b/)
  │     └── Survey Files (surv_b/image_jkl012.png)
  └── Temp Files (proj_123/export_mno345.json)
```

**Key Concept**: Files are deduplicated only within the same context. The same file uploaded to different contexts creates separate S3 objects.

## Documentation

**Core Concepts**:
- [file-system.md](./file-system.md) - System overview, contexts, storage paths, deduplication
- [lifecycle.md](./lifecycle.md) - File states, deletion, resurrection, temp files
- [api-guide.md](./api-guide.md) - Practical guide for developers, common operations
- [deduplication.md](./deduplication.md) - Deep dive: standard file dedup vs image-set dedup

## Key Implementation Files

**Server-side**:
- `package/api/src/model/service/core/ServiceFile/` - Core file operations (upload, deletion, references)
- `package/common/src/model/constructor/File.ts` - File entity model
- `package/api/src/common/s3Client.ts` - S3 client utilities

**Client-side**:
- `package/common/src/uploadFile.ts` - Upload utility with deduplication and progress tracking
- `package/app/src/appAdmin/component/SurveyFileManager/` - File management UI component

**Configuration**:
- `package/api/src/config/default.ts` - Global S3 configuration (env vars)

## Quick Links

**Get started**:
- [Upload a file](./api-guide.md#client-upload)
- [Delete files](./api-guide.md#delete-files)
- [Create temp downloads](./api-guide.md#temp-downloads-server-generated-files)
- [Configure S3](./api-guide.md#configuration)

**Understand the system**:
- [How deduplication works](./file-system.md#deduplication-flow) / [detailed paths](./deduplication.md)
- [File contexts explained](./file-system.md#file-contexts)
- [Reference protection](./lifecycle.md#reference-protection)
- [Temp file lifecycle](./lifecycle.md#temp-files)

## Security

- All file operations require `projectAdmin` role
- Project isolation enforced by routing to the project's own database (`X-Project-Id` → `DataSourceContext`) — the `File` collection has no `projectId` field
- **Public bucket** files are accessible via public URLs (Nginx doesn't check auth)
- **Private bucket** files used for import/export operations with presigned URL access
- S3 credentials stored as private values, never exposed to client
- Use presigned URLs for all client-side S3 operations

## Related Documentation

- [Survey Publishing](../../../../docs/survey-publishing.md) - How files are referenced in snapshots
- [Snapshot Hash Deduplication](../../../../docs/snapshot-hash-deduplication.md) - Snapshot-level deduplication
