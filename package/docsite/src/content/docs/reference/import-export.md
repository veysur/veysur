---
title: Import / Export
description: Reference for the import and export formats supported by VeySur.
---

VeySur supports importing and exporting survey data in several formats. This lets you back up surveys, transfer them between projects, and move response or participant data in and out of the system.

## Export formats

| Format | Extension | Contents |
|--------|-----------|----------|
| VeySur Survey Template | .vsst | Survey structure ([sections and elements](/reference/survey-editor/survey-structure/#terminology), including content elements such as rich-text sections and embedded video), answer options, language translations, custom participant attribute definitions, and email templates. Includes asset file attachments. Does not include publications, responses, or participant records. |
| VeySur Survey Archive | .vssa | A complete backup of the survey, including language translations, custom participant attribute definitions, email templates, all publications and their language snapshots, and responses. |
| VeySur Survey Publication | .vssp | A single publication, including its snapshot, language snapshots, responses, and asset file attachments. |
| Survey Markdown | .md | Plain-text survey definition: title, welcome and thank-you text, languages, groups, simple questions with answer options, and content elements. Does not include publications, responses, participant records, or survey settings. |
| CSV | .csv | Tabular data, used primarily for responses and participants. |
| VeySur Project Settings | .vsps | Project timezone, survey settings, and project email templates. Does not include survey schedules, surveys, or responses. |

## What can be exported

| Entity | Available formats |
|--------|------------------|
| Survey (template only) | VSST |
| Survey (structure only, plain text) | Markdown |
| Survey (full, with publications) | VSSA |
| Publication | VSSP |
| Responses | CSV |
| Participants | CSV |
| Project settings | VSPS |
| Custom attribute definitions | VSST, VSSA |
| Email templates | VSST, VSSA |

Export actions (indicated by the **download** icon) are available from the relevant section of the survey editor:

- Survey export: available from the survey-level actions, including **Export as Markdown**
- Publication export: available from the Publications tab
- Response export: available from the Responses tab toolbar
- Participant export: available from the Participants tab toolbar

## Importing

Import buttons (indicated by the **upload** icon) are available in the same sections. To import:

1. Click **Import** in the relevant section.
2. Select or drag in the file you wish to upload.
3. The system validates the file and reports any errors before processing.
4. If the file is valid, it is imported and the new records appear in the list.

If the file contains errors or is incompatible with the current survey, an error list is shown. No partial data is imported; the file must be corrected and re-uploaded.

Imported survey files are also validated for reserved entity codes. [Sections and elements](/reference/survey-editor/survey-structure/#terminology), answer options, and subquestions with a code of `OTHER`, `OTHER_TEXT`, or `ORDER` will cause the import to fail. Correct these codes in the file before re-importing.

## Markdown format

A Markdown survey (`.md`) is a single plain-text file that can be edited in any text editor and imported again. It suits quick edits, version control, and drafting surveys with an LLM chat bot. Only simple question types and content elements are supported; matrix, multi-part, ranking, and image select questions, and conditions, are not. Import it from the survey list like any other survey file.

To have a chat bot write the file, follow [Generate a Survey with an LLM](/guides/generate-survey-with-llm/), which includes a download link for the full format specification.

## Project settings

A project settings file (`.vsps`) holds the project timezone, the survey settings that surveys inherit, and the project email templates. Export it from **Settings > Project**. Import it on the same page of another project, choosing which parts to apply. Survey settings are replaced; email templates overwrite those with the same type and language and leave the rest. Only the project owner can import the timezone. Survey schedules are not included.

## Background processing

Larger exports and imports are processed in the background instead of completing immediately. When this happens, progress and the resulting download link appear in the **notifications** menu in the top navigation bar, and the export or import continues even if the current page is closed. A failed background job shows an error message in the notification instead of a download link.

Smaller exports and imports still complete immediately, with the file downloaded or the imported data applied straight away.

## Format compatibility

VSST, VSSA, VSSP, and VSPS files are specific to VeySur and should only be used with VeySur imports. Markdown survey files are plain text and follow the published format specification. The current survey file format is version 2.0. Files produced by older versions of VeySur are rejected on import and cannot be re-imported. CSV files for responses and participants follow a fixed column layout; refer to an existing export to understand the expected column order when preparing a CSV for import.

VSSP and VSSA exports stream responses in batches and impose no limit on response count.

## Archive file structure

For reference, the internal layout of each archive format is shown below.

**VSSP** (`.vssp`), single publication:
```
publication.vssp (tar+gz)
├── surveyPublication.json
├── surveySnapshot.json
├── surveySnapshotData.json
├── surveyLanguageSnapshots/
│   └── {languageCode}.json
├── responses/
│   ├── batch-000001.json   (up to 1 000 responses per file)
│   └── batch-000002.json
└── files/
    ├── manifest.json
    ├── {imageSetId}/
    │   ├── original.jpg
    │   ├── edited.jpg
    │   └── thumb.jpg
    ├── response-manifest.json
    └── response/
        └── {fileId}   (files uploaded by participants as File Upload question answers)
```

**VSSA** (`.vssa`), full survey with all publications:
```
survey-full.vssa (flat tar+gz)
├── survey.json
├── surveyLanguages/
│   └── {languageCode}.json
├── participantAttributes/
│   └── {name}.json
├── templates/
│   └── {type}-{lang}.json
├── snapshots/
│   └── {snapshotId}.json
├── snapshotData/
│   └── {snapshotId}.json
├── surveyLanguageSnapshots/
│   └── {snapshotId}/
│       └── {languageCode}.json
├── publications/
│   └── {pubId}.json
├── responses/
│   └── {pubId}/
│       ├── batch-000001.json
│       └── batch-000002.json
└── files/
    ├── manifest.json
    ├── {imageSetId}/
    │   ├── original.jpg
    │   ├── edited.jpg
    │   └── thumb.jpg
    ├── response-manifest-{bucket}.json
    └── response/
        └── {fileId}   (files uploaded by participants as File Upload question answers)
```

Response batch files each contain an array of up to 1 000 response records. There is no upper limit on the number of batch files.

Files uploaded as answers to File Upload questions are deduplicated by content: if the same file has already been imported into a survey, re-importing reuses the existing file rather than storing a duplicate.
