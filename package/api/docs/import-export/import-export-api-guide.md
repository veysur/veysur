# Import/Export API Guide

## API Endpoints

### Export Entity

```http
POST /api/import-export/export/:entityType/:entityId/:format
Headers:
  X-Project-Id: <projectId>
  Authorization: Bearer <token>

Response:
{
  "fileId": "file_abc123",
  "downloadUrl": "https://s3.../...",
  "filename": "survey-name-2025-01-15.vsst",
  "expiresAt": "2025-01-15T12:00:00Z"
}
```

**Parameters**:
- `entityType`: `'survey' | 'surveyResponse' | 'surveyPublication' | 'surveyFull'`
- `entityId`: ID of entity to export
- `format`: `'vsst' | 'json' | 'vssp' | 'vssa'`

**Body (optional)**:
```json
{
  "options": {
    "publicationId": "<publicationId>"
  }
}
```
`options.publicationId` is required for `surveyResponse` and `surveyPublication`.

**Authorization**: Requires `projectAdmin` role

### Generate Import URL

```http
POST /api/import-export/import/url/:entityType
Headers:
  X-Project-Id: <projectId>
  Authorization: Bearer <token>
Body:
{
  "format": "vsst",
  "options": {
    "force": false
  }
}

Response:
{
  "fileId": "file_abc123",
  "uploadUrl": "https://s3.../...",
  "expiresAt": "2025-01-15T12:00:00Z"
}
```

For `surveyPublication` imports, `options.surveyId` is optional: if omitted a new survey is created; if provided and found in the database the existing survey is used; if provided but not found a new survey is created with that ID.

**Upload URL expires in 1 hour** - use immediately for S3 upload

### Process Import

```http
POST /api/import-export/import/process/:fileId
Headers:
  X-Project-Id: <projectId>
  Authorization: Bearer <token>

Response (success):
{
  "success": true,
  "entityId": "survey_xyz",
  "entityType": "survey",
  "hasIdTranslations": true,
  "repairs": [...]
}

Response (validation error):
{
  "error": "BadRequest",
  "message": "Import validation failed",
  "errors": [...],
  "hint": "Use force=true to attempt automatic repair"
}
```

## Common Operations

### Export Survey

```javascript
const response = await fetch(`/api/import-export/export/survey/${surveyId}/vsst`, {
  method: 'POST',
  headers: {
    'X-Project-Id': projectId,
    'Authorization': `Bearer ${token}`
  }
})
const { downloadUrl, filename } = await response.json()

// Download file
const fileResponse = await fetch(downloadUrl)
const blob = await fileResponse.blob()

// Trigger browser download
const a = document.createElement('a')
a.href = URL.createObjectURL(blob)
a.download = filename
a.click()
```

See: `/package/api/src/endpoint/import-export.ts:export()`

### Import Survey (Three Steps)

```javascript
// Step 1: Get upload URL
const urlRes = await fetch('/api/import-export/import/url/survey', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Project-Id': projectId,
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    format: 'vsst',
    options: { force: false }
  })
})
const { fileId, uploadUrl } = await urlRes.json()

// Step 2: Upload to S3 (direct)
await fetch(uploadUrl, {
  method: 'POST',
  body: fileBlob,
  headers: { 'Content-Type': 'application/octet-stream' }
})

// Step 3: Process import
const processRes = await fetch(`/api/import-export/import/process/${fileId}`, {
  method: 'POST',
  headers: {
    'X-Project-Id': projectId,
    'Authorization': `Bearer ${token}`
  }
})

if (!processRes.ok) {
  const error = await processRes.json()
  // Handle validation errors
  console.log(error.errors)
  console.log(error.hint) // "Use force=true to attempt automatic repair"
}

const result = await processRes.json()
console.log('Imported survey:', result.entityId)
if (result.hasIdTranslations) {
  console.log('IDs were auto-adjusted to avoid conflicts')
}
```

See: `/package/api/src/endpoint/import-export.ts:processImport()`

### Import with Auto-Repair

If validation fails, retry with `force: true`:

```javascript
// First attempt with force: false (default)
const urlRes1 = await fetch('/api/import-export/import/url/survey', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Project-Id': projectId },
  body: JSON.stringify({ format: 'vsst', options: { force: false } })
})

// ... upload and process ...

// If validation fails, retry with force: true
const urlRes2 = await fetch('/api/import-export/import/url/survey', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Project-Id': projectId },
  body: JSON.stringify({ format: 'vsst', options: { force: true } })
})

// ... upload and process ...
// Check result.repairs for details on what was auto-fixed
```

## Configuration

### S3 Settings

Configure via environment variables in `package/api/src/config/default.ts`:
- `API_S3_TYPE` - `local` or `s3` (S3-compatible, e.g. Garage)
- `API_S3_PUBLIC_BUCKET` / `API_S3_PRIVATE_BUCKET` - bucket names
- `API_S3_REGION` - AWS region (default: `us-east-1`)
- `API_S3_ACCESS_KEY_ID` / `API_S3_SECRET_ACCESS_KEY` - AWS credentials
- `API_S3_LOCAL_SECRET` - HMAC key for upload tokens
- `API_S3_PUBLIC_BASE_URL` - public base URL for upload endpoint

See: [file-management/api-guide.md](../file-management/api-guide.md#configuration) for full S3 config reference.

### URL Expiration

Default expiration times (hardcoded):
- **Upload URLs**: 1 hour
- **Download URLs**: 6 hours
- **Pending imports**: Auto-delete after 1 hour
- **Completed imports**: Auto-delete after 7 days

Modify in ServiceImportExport if needed.

### Supported Combinations

Current support matrix:

| Entity Type | Format | Import | Notes |
|-------------|--------|--------|-------|
| `survey` | `vsst` | Yes | Import and export; full survey state with embedded answer-option images. Suitable for sharing survey templates across projects. |
| `surveyResponse` | `json` | No | Export-only; requires `options.publicationId` |
| `surveyPublication` | `vssp` | Yes | Import and export; requires `options.publicationId` for export; tar+gz archive contains JSON files + embedded binary images for answer options |
| `surveyFull` | `vssa` | Yes | Import and export; flat tar+gz archive — survey + all publications in a single streaming archive |

Future additions require implementing new handlers - no code changes to core system.

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| Unsupported entity type | Invalid entityType in URL | Use 'survey', 'surveyResponse', 'surveyPublication', or 'surveyFull' |
| Format not supported | Invalid format or entity doesn't support format | Check entity.getSupportedFormats() |
| File not found/expired | Upload URL expired or file already processed | Generate new upload URL |
| Import validation failed | Data doesn't match schema | Fix data or use `force: true` |
| Already processing | processImport() called twice | Wait for first call to complete |

### Validation Error Structure

```javascript
{
  "error": "BadRequest",
  "message": "Import validation failed",
  "errors": [
    {
      "type": "schema",      // or "reference"
      "field": "name",       // which field failed
      "message": "Required"  // error detail
    }
  ],
  "hint": "Use force=true to attempt automatic repair"
}
```

## Troubleshooting

### Import fails with "file not found"

**Cause**: Upload URL expired (1 hour) or file already processed

**Solution**: Generate new upload URL and retry upload

### Export URL doesn't download

**Cause**: Presigned download URL expired (6 hours)

**Solution**: Request new export - URLs are single-use and time-limited

### Validation errors on import

**Cause**: Data has schema violations or broken references

**Solution**:
1. Review `errors` array in response
2. Fix source data and retry, OR
3. Use `options: { force: true }` to auto-repair
4. Check `repairs` array in result to see what was fixed

### IDs changed after import

**Expected behaviour**: System auto-translates IDs when collisions detected

**Details**: Response includes `hasIdTranslations: true` when IDs were adjusted to avoid conflicts with existing entities

### Upload stuck in "pending"

**Cause**: S3 upload not completed or failed silently

**Solution**: File auto-deletes after 1 hour - generate new URL and retry

## Adding New Handlers

### New Entity Type

1. Implement `EntityHandlerInterface`
2. Register in `ServiceImportExport.init()`
3. Endpoints automatically support new type

See example: `/package/api/src/model/service/core/ImportExport/handlers/SurveyEntityHandler.ts`

### New Format

1. Implement `FormatHandlerInterface`
2. Register in `FormatRegistry`
3. Update entity handler's `getSupportedFormats()`

See example: `/package/api/src/model/service/core/ImportExport/format/VsstFormatHandler.ts`
