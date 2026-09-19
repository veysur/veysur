# Import/Export System

## Overview

The Veysur import/export system provides a generic, extensible architecture for bulk data operations across different entity types (surveys, participants, etc.) and file formats (VSST, VSSP, JSON). The system uses a two-step import process where clients upload directly to S3, then trigger server-side processing. This protects API resources from slow client uploads/downloads while leveraging S3's proven durability for file storage.

## Key Workflows

### Export Flow
```
Client → POST /api/export/:entityType/:id/:format
  ↓
ServiceImportExport → EntityHandler → FormatHandler
  ↓
S3 Upload → Presigned Download URL
  ↓
Response: { downloadUrl, filename, expiresAt }
```

### Import Flow
```
Step 1: Client → POST /api/import/url/:entityType
        Response: { uploadUrl, fileId }

Step 2: Client → PUT {uploadUrl} (direct to S3)

Step 3: Client → POST /api/import/process/:fileId
        ServiceImportExport processes file
        Response: { success, entityId, repairs }
```

## Documentation Structure

- **[import-export-system.md](./import-export-system.md)** - Core concepts, components, and architecture
- **[import-export-lifecycle.md](./import-export-lifecycle.md)** - State transitions and workflows
- **[import-export-api-guide.md](./import-export-api-guide.md)** - Practical usage and troubleshooting
- **[response-csv.md](./response-csv.md)** - Response CSV import/export format and usage

## Supported Formats

| Format | Extension | Description |
|--------|-----------|-------------|
| VSST | `.vsst` | Live survey template + embedded answer-option images (tar+gz archive) |
| VSSP | `.vssp` | Single publication snapshot + responses + images (tar+gz archive); responses split into `responses/batch-00000N.json` files of 1000 |
| VSSA | `.vssa` | Combined snapshot — flat tar+gz archive; survey template + all publications; responses at `responses/{pubId}/batch-00000N.json` |
| JSON | `.json` | Generic JSON (response export) |
| CSV | `.csv` | Survey response data (export/import) |

## Key Source Files

- **ServiceImportExport**: `/package/api/src/model/service/core/ServiceImportExport.ts` - Main orchestration service
- **EntityHandlerRegistry**: `/package/api/src/model/service/core/ImportExport/EntityHandlerRegistry.ts` - Entity type registry
- **SurveyEntityHandler**: `/package/api/src/model/service/core/ImportExport/handlers/SurveyEntityHandler.ts` - Survey-specific logic (collaborators in `handlers/SurveyEntityHandler/`)
- **FormatRegistry**: `/package/api/src/model/service/core/ImportExport/format/FormatRegistry.ts` - Format handler registry
- **API Endpoints**: `/package/api/src/endpoint/import-export.ts` - Generic REST endpoints

## Security & Configuration

- **Authorization**: All endpoints require `projectAdmin` role
- **File Storage**: Private S3 bucket (`veysur-private`) with presigned URLs (1-hour expiration for uploads, 6-hour for downloads)
- **File Cleanup**: Import files auto-delete after 1 hour if not processed, 7 days after processing
- **Validation**: Automatic ID collision detection, optional data repair with `force: true`
- **Temp file security**: See [temp-file-security.md](./temp-file-security.md) — import disk exposure eliminated via streaming tar+gz; export temp file is short-lived
