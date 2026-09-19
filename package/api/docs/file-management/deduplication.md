# File Deduplication

<!-- cspell:ignore uplication -->

There are two distinct server-side deduplication paths, both triggered by `POST /file/upload-url`
in `ServiceFileUpload.generateUploadUrl()`. The path taken depends on whether `imageSetId` and
`imageVariant` are present in the request.

See [file-system.md#deduplication-flow](./file-system.md#deduplication-flow) for the introductory
diagram and context-isolation rules.

---

## Path A: Standard File Deduplication

Taken when `imageSetId` / `imageVariant` are **absent**.

**Hash input**: SHA256 of the file bytes (`fileHash`, 64-char hex), calculated client-side before
the request.

**DB lookup**: `RepoFile.findByHashWithContext()` — exact match on
`{ hash, surveyId, responseId, fileContext }`, scoped to the project purely by which
project database the request is routed to (the `File` collection has no `projectId`
field). Context matching rules:

| `fileContext` | Query conditions |
|---|---|
| `response` | `surveyId` matches, `responseId` matches, `fileContext='response'` |
| `survey` | `surveyId` matches, `responseId=null`, `fileContext='survey'` |
| project / null | `surveyId=null`, `responseId=null` |

**Decision tree**:

```
Hash + context match?
  NO  → new DB record, return signed upload URL
  YES →
    Soft-deleted?
      YES → resurrection (see lifecycle.md#resurrection)
            S3 object still exists? → uploadUrl: null  (reuse object)
            S3 object missing?      → clear uploaded field, return new URL
      NO →
        Has uploaded timestamp?
          YES → uploadUrl: null  (clean dedup hit — no S3 upload needed)
          NO  → updateIncompleteUpload(), return new URL for the same path
```

**Response shape**: `{ fileId, uploadUrl: string | null, existingFile: boolean, resurrected?: boolean }`

The confirm step (`confirmUpload()`) marks `uploaded` and adds the survey reference. A clean dedup
hit skips the confirm step entirely because `uploadUrl` is null.
See [lifecycle.md#upload-process](./lifecycle.md#upload-process) for the full 8-step flow.

---

## Path B: Image Set Deduplication

Taken when both `imageSetId` and `imageVariant` are present. The server validates `imageSetId`
format (alphanumeric/dash/underscore, 1–128 chars) and that `imageVariant` is one of
`['edited', 'original', 'thumb']`.

**Dedup scope**: the `edited` variant only, and only when `fileHash` is non-empty. `original` and
`thumb` always skip deduplication — the caller passes `fileHash: ''` for those variants.

**Hash input**: SHA256 of the edited blob, calculated client-side in `FileApi.uploadImageSetVariant()`
before the request.

**DB lookup**: `RepoFile.findByImageSetHash()` — matches on
`{ hash, imageVariant: 'edited', surveyId, fileContext }`.

Soft-deleted records are included in the lookup — resurrection is handled on a match (see below).

**Decision tree**:

```
imageVariant === 'edited' and fileHash non-empty?
  NO  (original / thumb) → skip dedup entirely
        Existing record for this imageSetId + imageVariant?
          YES → reuse fileId, return fresh signed URL  (overwrite / re-edit)
          NO  → new DB record, uploaded set immediately, return signed URL
                add survey reference if surveyId present
  YES →
    findByImageSetHash match?
      YES →
        Soft-deleted?
          YES → resurrection: clear deleted + refs on all variants (edited, original, thumb)
                S3 object still exists? → uploadUrl: null  (reuse object, client skips all uploads)
                S3 object missing?      → clear uploaded on all variants, return new URL
          NO  → existingFile: true, uploadUrl: null, return existing filePath
                ↳ client skips original + thumb uploads entirely
      NO  →
            Existing record for this imageSetId + imageVariant?
              YES → reuse fileId, return fresh signed URL
              NO  → new DB record, uploaded set immediately, return signed URL
                    add survey reference if surveyId present
```

**Response shape**: `{ fileId, uploadUrl: string | null, existingFile: boolean, filePath: string }`

**Key behaviours**:

- No confirm step — `uploaded: new Date()` is set at URL-generation time, not after S3 upload
- Survey reference added at creation (not at confirm), on the `edited` variant when `surveyId` is
  provided
- A dedup hit on `edited` (`existingFile: true`) tells the client to skip `original` and `thumb`
  uploads entirely — only one network round-trip is made
- `imageSetId` is the SHA256 hash of the edited blob, computed client-side before upload — identical
  edited content always produces the same `imageSetId`, enabling deduplication and resurrection
  across operations
- Edit and undo operations produce a new `imageSetId` only when the edited content differs; old
  image-set records are cleaned up by survey-patch reference cleanup

See [api-guide.md#image-set-upload](./api-guide.md#image-set-upload) for the caller-facing API
contract.

---

## Comparison

| Dimension | Path A (Standard) | Path B (Image Set) |
|---|---|---|
| Trigger | No `imageSetId` | `imageSetId` + `imageVariant` present |
| Dedup key | hash + surveyId + responseId + fileContext | hash + surveyId + fileContext, `edited` variant only |
| Applies to | All files | `edited` variant only; `original`/`thumb` always upload |
| Soft-deleted records | Resurrected | Resurrected (all variants) |
| Confirm step | Required | None — `uploaded` set at URL generation |
| Survey reference | Added at confirm | Added at URL generation (`edited` variant) |
| DB lookup | `findByHashWithContext()` | `findByImageSetHash()` |

---

## Implementation References

- `package/api/src/model/service/core/ServiceFile/ServiceFileUpload.ts` — branching entry point; image-set branch opens at `if (imageSetId && imageVariant)`
- `package/api/src/model/service/core/ServiceFile/FileDeduplication.ts` — `findExistingFile`, `findExistingImageSet`, `handleFileResurrection`, `handleImageSetResurrection`, `updateIncompleteUpload`
- `package/api/src/model/repo/core/RepoFile.ts` — `findByHashWithContext`, `findByImageSetHash`
- `package/app/src/appAdmin/api/FileApi.ts` — client-side hash calculation; shows when `fileHash` is `''` vs computed
- `package/app/src/appAdmin/component/SurveyEditor/QuestionTypeEdit/MultipleChoiceImageEdit/hooks/useImageUpload.ts` — hash-as-imageSetId derivation; `editedDeduped` early-return pattern
- `package/app/src/appAdmin/component/SurveyEditor/QuestionTypeEdit/MultipleChoiceImageEdit/hooks/useImageFileManagement.ts` — hash-as-imageSetId derivation on edit/undo
