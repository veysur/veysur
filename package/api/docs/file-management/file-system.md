# File System Overview

## What It Does

The file management system provides S3-based storage for the Veysur platform with five key capabilities:

1. **Dual-bucket architecture** - Separate public and private buckets for different access levels
2. **Context-based organization** - Files organized by project/survey/response/temp hierarchy
3. **Content deduplication** - Reuses identical files within the same context
4. **Two-stage deletion** - Soft delete (recoverable) → Hard delete (permanent)
5. **Direct client uploads** - Presigned URLs enable client-to-S3 uploads without server proxying

## Bucket Types

Files are stored in one of two S3 buckets based on their access requirements:

| Bucket Type | Bucket Name | Usage | Current Status |
|-------------|-------------|-------|----------------|
| **Public** | `veysur-files` | General file uploads (surveys, responses, projects) | Active - all files currently use this |
| **Private** | `veysur-private` | Sensitive operations requiring controlled access | Infrastructure ready - planned for import/export |

Each file record includes a `bucketType` field (`public` or `private`) that determines which bucket stores the file and how URLs are constructed.

## File Contexts

Files are organized into four contexts, each with its own storage path:

| Context | Use Case | Path Pattern | Example |
|---------|----------|--------------|---------|
| **Project** | Project-level files (logos, templates) | `project-{projectId}/{filename}` | `project-33JLwlFkwL/logo_abc123.png` |
| **Survey** | Survey-specific files (images, docs) | `project-{projectId}/survey/{surveyId}/{filename}` | `project-33JLwlFkwL/survey/survey_x/doc_def456.pdf` |
| **Response** | Participant file uploads (resumes, photos) | `project-{projectId}/survey/{surveyId}/response/{responseId}/{filename}` | `project-33JLwlFkwL/survey/survey_x/response/response_1/resume_ghi789.pdf` |
| **Temp** | Server-generated downloads (exports, reports) | `project-{projectId}/temp/{filename}` | `project-33JLwlFkwL/temp/export_jkl012.json` |

**Context Isolation**: Files are deduplicated only within the same context. The same file uploaded to different contexts creates separate S3 objects.

```
Example: Uploading "logo.png" (same content)

Project context    → project-33JLwlFkwL/logo_abc123.png                    (S3 object 1)
Survey A context   → project-33JLwlFkwL/survey/survey_a/logo_abc123.png    (S3 object 2)
Survey B context   → project-33JLwlFkwL/survey/survey_b/logo_abc123.png    (S3 object 3)

Result: 3 separate S3 objects (one per context)
```

## Deduplication Flow

When uploading a file, the system checks if identical content already exists in the same context:

```
Upload Request
      ↓
Calculate SHA256 Hash
      ↓
Check: Hash + Context Match?
      ↓
  ┌───┴───┐
  │       │
 YES     NO
  │       │
  ↓       ↓
Reuse   Create
File    New File
  │       │
  └───┬───┘
      ↓
   Done
```

**Same Context = Deduplication**: Upload "report.pdf" to Survey A twice → Reuses same file record, no new S3 upload

**Different Context = New File**: Upload "report.pdf" to Survey A and Survey B → Creates 2 separate S3 objects

## Storage Paths

Files are stored with normalized filenames that include a content hash:

**Pattern**: `{normalized-name}_{hash16}.{ext}`

**Example**:
- Original: `My Report 2024.pdf`
- SHA256: `a1b2c3d4e5f6g7h8...` (full hash)
- Stored: `my-report-2024_a1b2c3d4e5f6g7h8.pdf`

**Normalization**:
- Lowercase, replace non-alphanumeric with hyphens
- Basename limited to 50 chars, extension to 10 chars
- Append first 16 characters of hash for uniqueness

**Image set files** (answer option images) use a content-addressed variant that groups 3 files by `imageSetId`:

Pattern: `project-{projectId}/survey/{surveyId}/imgset-{imageSetId}/{variant}.jpg`
Variants: `original`, `edited`, `thumb`
Example: `project-33JLwlFkwL/survey/survey_x/imgset-abc123/edited.jpg`

Image set files are always JPEG. Filenames are fixed (no hash suffix). The `edited` variant supports hash-based dedup when `fileHash` is provided; `original` and `thumb` are not hashed.

Image sets have a separate dedup path keyed on the `edited` variant hash + surveyId + fileContext. When a match is found, the server returns the existing file info and no S3 upload is needed.

## URL Structure

File URLs include the bucket name as a path prefix:

```
https://{host}/{bucket-name}/{s3-path}
```

**Public Bucket Examples** (current - all files):
- Project file: `https://project-1.veysur.local/veysur-files/project-33JLwlFkwL/logo_abc123.png`
- Survey file: `https://account.veysur.local/veysur-files/project-33JLwlFkwL/survey/survey_x/doc_def456.pdf`
- Temp file: `https://account.veysur.local/veysur-files/project-33JLwlFkwL/temp/export_jkl012.json`

**Private Bucket Examples** (planned - import/export):
- Import file: `https://account.veysur.local/veysur-private/project-33JLwlFkwL/import/data_abc123.csv`
- Export file: `https://account.veysur.local/veysur-private/project-33JLwlFkwL/temp/export_def456.json`

**How It Works**:
- Nginx proxies `veysur-files/*` and `veysur-private/*` paths to API storage middleware
- File entity's `bucketType` field determines which bucket prefix to use
- Presigned URLs use same domain as API request (no CORS issues)

## Implementation

**Key source files**:
- `package/api/src/model/service/core/ServiceFile/` - Core file operations
- `package/common/src/model/constructor/File.ts` - File entity model
- `package/api/src/common/s3Client.ts` - S3 client utilities
- `package/common/src/uploadFile.ts` - Client upload utility

**Database**:
- Collection: `File` (project-scoped — no `projectId` field; isolation comes from routing to the project's own database)
- Key fields: `hash`, `surveyId`, `responseId`, `fileContext`, `bucketType`, `uploadedAt`, `deletedAt`, `imageSetId`, `imageVariant`
- `imageSetId` — groups the 3 image set variants together
- `imageVariant` — `'original' | 'edited' | 'thumb'`
- `bucketType`: `'public' | 'private'` - Determines which S3 bucket stores the file (defaults to `'public'`)
- Indexes: `hash` (for deduplication), `surveyId`/`responseId`/`fileContext` (for queries)