# Response CSV Import/Export

## Overview

Survey responses can be exported to CSV for external analysis or bulk-edited and re-imported. The export produces a structured CSV with two header rows (codes, labels) followed by one data row per response. Importing parses the same format and creates or updates responses against a specific publication snapshot.

## CSV Format

### Header Rows

| Row | Content |
|-----|---------|
| 1 | Column codes — machine-readable keys (`surveyId`, `Q001`, `Q001.A001`, `Q001.SQ001.A001`) |
| 2 | Labels — question text for question columns; answer option label for binary AO columns |

### Fixed Columns (always present)

| Column | Description |
|--------|-------------|
| `surveyId` | Survey identifier |
| `publicationId` | Publication the response belongs to |
| `snapshotId` | Snapshot used when response was collected |
| `responseId` | Response identifier (blank = new response on import) |
| `participantId` | Participant identifier |
| `nameFirst` | Participant first name |
| `nameLast` | Participant last name |
| `email` | Participant email (used for deduplication on import) |

### Dynamic Columns

Each question produces a main column plus one binary answer option column per answer option (for choice questions). Columns appear in this order: main column, then its binary AO columns, then the next question.

#### Main question column codes

- `Q001` — standalone question (no subquestions)
- `Q001.SQ001` — subquestion (matrix checkbox subquestion, non-matrix subquestion, or Multi-Part part)
- `Q001.SQ001.A001` — matrix non-checkbox subquestion column (one per subquestion × answer option pair)

Multi-Part questions use the plain `Q001.SQ001` form — one column per part, no `.A001`
suffix, since Multi-Part has no answer-option axis. Contrast with Matrix's three-segment
`Q001.SQ001.A001` cell columns.

#### Binary answer option column codes

- `Q001.A001` — answer option A001 for standalone question Q001
- `Q001.SQ001.A001` — answer option A001 for non-matrix subquestion SQ001
- `Q001.SQ001.A001` — answer option A001 for matrix subquestion SQ001 (SQ dimension before AO, consistent with matrix convention)
- `Q001.SQ001.A001.SQA001` — answer option SQA001 for matrix subquestion SQ001 of matrix answer option Q001.A001 (future; not yet applicable)

#### Value formats

| Column type | Value format |
|-------------|-------------|
| Main: `dropdown`, `button` | Single answer option code, e.g. `A001` |
| Main: `yesNo` | `1` (yes) or `0` (no) |
| Main: `checkbox`, `imageSelect` | Comma-separated codes, e.g. `A001,A003`; may include `OTHER` when Other option is enabled, e.g. `A001,OTHER` |
| Main: `dropdown`, `button` (with Other enabled) | Single answer option code or `OTHER` |
| Main: matrix checkbox subquestion | Comma-separated selected answer option codes |
| Main: matrix non-checkbox subquestion | Value matching the subquestion type |
| Main: `starRating`, `point5`, `point10`, `number` | Numeric value |
| Main: `text`, `longText` | String value |
| Main: Multi-Part Text part (`Q001.SQ001`) | String value |
| Main: Multi-Part Number part (`Q001.SQ001`) | Numeric value |
| Main: Multi-Part Yes/No part (`Q001.SQ001`) | `1` (yes) or `0` (no) |
| Main: Multi-Part Stars / 5-Point / 10-Point part (`Q001.SQ001`) | Numeric value |
| Binary AO column (`Q001.A001`) | `1` if selected, `0` if not |
| Binary Other column (`Q001.OTHER`) | `1` if Other option selected, `0` if not |
| Other value column (`Q001.OTHER_VALUE`) | Value entered in the Other field (string); only present when choiceOther is enabled |
| Main: `fileUpload` | Comma-separated fileIds referenced by the answer, e.g. `file_a,file_b` — read-only, see below |

## Export

### UI

Response list page → **Export CSV** button. A publication must be selected before exporting.

### API

```
POST /api/import-export/export/surveyResponse/{surveyId}/csv
X-Project-Id: {projectId}

{ "options": { "publicationId": "...", "snapshotId": "..." } }
```

Response:
```json
{ "fileId": "...", "downloadUrl": "...", "filename": "responses.csv", "expiresAt": "..." }
```

Download URL expires after 6 hours.

### Key source files

- Hook: `package/app/src/appAdmin/component/SurveyResponse/hook/useExportSurveyResponseCsv.ts`
- Handler: `package/api/src/model/service/core/ImportExport/handlers/SurveyResponseEntityHandler.ts`
- Format: `package/api/src/model/service/core/ImportExport/format/CsvFormatHandler.ts`

## Import

### UI

Navigate to `/admin/survey/{id}/response/import`, select a CSV file and publication, then click **Import**. The result shows how many responses were skipped due to validation issues.

### API (3-step flow)

```
Step 1: POST /api/import-export/import/url/surveyResponse
{ "format": "csv", "options": { "surveyId": "...", "publicationId": "...", "snapshotId": "..." } }
→ { "fileId": "...", "uploadUrl": "..." }   (upload URL valid 1 hour)

Step 2: PUT {uploadUrl}   (direct S3 upload — no API involvement)

Step 3: POST /api/import-export/import/process/{fileId}
→ { "success": true, "entityId": "...", "warnings": [...] }
```

All three options (`surveyId`, `publicationId`, `snapshotId`) are required.

### Import behaviour for binary AO columns

Binary answer option columns (`Q001.A001`) are supplementary on import. If the main question column (`Q001`) already has a value, binary columns are ignored for that answer option. If the main column is blank, binary columns are used to reconstruct the selected options. `OTHER` and `OTHER_VALUE` follow the same rules — `Q001.OTHER` participates in binary reconstruction of the main column, and `Q001.OTHER_VALUE` is applied as the free value.

### `fileUpload` questions are a one-way, read-only export

CSV has no channel for binary file content, so a `fileUpload` question's column is
export-only: it lists the answer's referenced fileIds (comma-joined), never the file
bytes. On import, a `fileUpload` column is silently skipped — no answer is written for
that question from the CSV — rather than writing a bogus `{fileIds}`-shaped value from a
bare id string, since a fileId from a different project/survey/export would not resolve
to a real file. To restore actual files (and the responses that reference them), use a
`.vssp`/`.vssa` import instead, which bundles and remaps the binary content (see
[import-export-system.md](./import-export-system.md)).

### Key source files

- Hook: `package/app/src/appAdmin/page/PageSurveyEdit/PageSurveyEditResponseImport.tsx`
- Import hook: `package/app/src/appAdmin/component/ImportExport/hook/useImportSurveyResponse.ts`
- Handler: `package/api/src/model/service/core/ImportExport/handlers/SurveyResponseEntityHandler.ts`

## Notes

- **Deduplication**: participants are matched by email within the survey; existing records are updated, new emails create new participants/responses
- **Authorization**: `projectAdmin` role required on all endpoints
- **General import/export patterns**: see [import-export-system.md](./import-export-system.md) and [import-export-api-guide.md](./import-export-api-guide.md)
