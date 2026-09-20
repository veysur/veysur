# File Lifecycle

## File States

Files progress through these states during their lifecycle:

```
[Pending] → [Uploaded] → [Soft Deleted] → [Hard Deleted]
                ↓              ↓
            [Active]      [Resurrected]
```

| State | `uploaded` | `deleted` | Description |
|-------|------------|-----------|-------------|
| **Pending** | `null` | `null` | Record created, waiting for S3 upload |
| **Uploaded** | `Date` | `null` | File uploaded and verified, ready to use |
| **Soft Deleted** | `Date` | `Date` | Marked as deleted, S3 preserved (recoverable) |
| **Hard Deleted** | - | - | Permanently removed from S3 and database |

## Upload Process

```
[Select File] → [Calculate Hash] → [Request URL] → [Upload to S3] → [Confirm] → [Active]
                      ↓                  ↓
                [Check Dedup]     [Generate URL or Reuse]
```

1. Client calculates SHA256 hash
2. Requests upload URL from server
3. Server checks for existing file with same hash + context
4. If exists: Returns existing file (deduplication)
5. If new: Generates presigned S3 URL
6. Client uploads directly to S3
7. Client confirms upload
8. Server verifies S3 object exists and marks file as uploaded

**Implementation**: `ServiceFileUpload.generateUploadUrl()` and `confirmUpload()` in `package/api/src/model/service/core/ServiceFile/`

> **Image set uploads** (used by `imageSelect` questions) use a different flow: the server creates the file record and marks it as `uploaded` immediately when the URL is requested — no confirm step. The `imageSetId` is the SHA256 hash of the edited blob, computed client-side. The `edited` variant is deduplicated by hash + surveyId + fileContext; soft-deleted records are resurrected on a match (all three variants). `original` and `thumb` are not hashed. Edit and undo operations produce a new `imageSetId` only when the edited content differs — old file records are cleaned up by survey-patch reference cleanup. See [api-guide.md — Image Set Upload](./api-guide.md#image-set-upload).

## Deletion Workflows

### Soft Delete

**Purpose**: Immediate removal that's recoverable

**API**: `DELETE /api/file/:fileId`

**Process**:
1. Check if file has references (survey, snapshot)
2. Auto-remove stale survey references
3. If references remain → **BLOCK deletion** (throws error)
4. If no references → Mark file as deleted (set `deleted` timestamp)
5. S3 object and database record preserved

**Bulk operations** (for surveys/responses):
- `bulkDeleteForSurvey()` - Marks all survey files as deleted
- `bulkDeleteForResponse()` - Marks all response files as deleted
- Does NOT check references (by design)

### Hard Delete

**Purpose**: Permanent cleanup of old soft-deleted files

**API**: `DELETE /api/file/hard/:olderThan?fileContext=temp`

**Process**:
1. Find files with `deleted` timestamp older than threshold
2. Delete from S3 storage
3. Remove from database
4. Process in batches of 500

**Examples**:
```bash
# Clean up files deleted more than 1 hour ago
DELETE /api/file/hard/PT1H

# Clean up temp files expired more than 1 day ago
DELETE /api/file/hard/P1D?fileContext=temp
```

**Regular files**: Automated — task manager runs hourly, deletes files soft-deleted >1 hour ago (`hardDeleteAll` action on `fileDeletion` service). S3 errors are tracked per-file (`totalStorageErrors`) but don't block DB cleanup.

**Temp files**: NOT automatic — must run hard delete manually (see Temp Files section)

### Resurrection

**Purpose**: Reuse existing S3 objects when re-uploading deleted files

**When it happens**: Upload file with same hash + context as soft-deleted file

**Process**:
1. Server detects existing soft-deleted file
2. Clears `deleted` timestamp
3. If S3 object still exists → Return file immediately (no upload needed)
4. If S3 object was cleaned up → Generate new upload URL for same path

**Example**:
```
Day 0:  Upload "report.pdf" → File created
Day 5:  Delete "report.pdf" → Soft deleted (S3 preserved)
Day 10: Re-upload "report.pdf" → Resurrection:
        - Clear deleted timestamp
        - S3 exists → Return file instantly (no upload)
```

## Reference Protection

Files cannot be soft-deleted if they have active references.

**Reference types**:
- **Survey** - File used in survey questions/answer options
- **Snapshot** - File used in published snapshots

**Protection behaviour**:
```
Try to delete file
  ↓
Check references
  ↓
┌─────────────┬──────────────┐
│ Has refs    │ No refs      │
│ ↓           │ ↓            │
│ BLOCK       │ SOFT DELETE  │
│ (throw err) │ (mark del)   │
└─────────────┴──────────────┘
```

**Auto-cleanup**: System automatically removes stale survey references (files no longer in questions) before checking protection. Survey reference checks use `answerOption.imageFileId` for image files — the `files[]` array no longer exists on answer options.

## Temp Files

Temp files have a special lifecycle for server-generated content (exports, reports).

**Creation**: `ServiceFileTempDownload.createTempDownload()`
- File created with `deleted` timestamp already set to future expiration time
- Immediately available for download
- Deduplication reuses existing temp files and extends expiration

**Cleanup**: NOT automatic - must run hard delete manually:
```bash
docker compose exec -T \
  -e API_TASK=fileDeletion -e API_ACTION=hardDeleteAll \
  -e API_TASK_JSON='{"olderThan": "P1D", "fileContext": "temp"}' \
  api node dist/run.js
```

**Workflow**:
```
Create Temp File (deleted: +6 hours)
  ↓
User Downloads
  ↓
Expiration Time Passes
  ↓
Manual Cleanup (hard delete endpoint)
  ↓
Permanently Deleted
```

## Automatic File Cleanup During Survey Patches

When survey patches are applied (e.g., deleting an answer option with images), the system automatically attempts to delete files that are no longer used.

**How it works**:
1. Track files added/removed during patch application
2. Calculate net removed files (removed but not re-added)
3. Attempt to delete each net removed file
4. Reference checking prevents deletion if file is still in use

**Implementation**: `ServiceSurvey.patch()` in `package/api/src/model/service/core/ServiceSurvey.ts`

## Implementation References

- Upload: `package/api/src/model/service/core/ServiceFile/ServiceFileUpload.ts`
- Deletion: `package/api/src/model/service/core/ServiceFile/ServiceFileDeletion.ts`
- References: `package/api/src/model/service/core/ServiceFile/FileReference.ts`
- Client utility: `package/common/src/uploadFile.ts`