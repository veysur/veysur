---
title: File Upload Question Type
description: Reference for the File Upload question type in VeySur.
---

The File Upload question type lets a participant attach one or more files as their answer. Use it when a survey needs supporting documents, images, or other files rather than a text or numeric response.

## Options

| Option | Description |
|--------|-------------|
| Required | Participant must upload at least one file. |
| Max file size | The largest size allowed for a single file, in MB. Defaults to 10 MB. |
| Max number of files | The maximum number of files a participant may attach. Defaults to 1. |
| Allowed file types | Restrict uploads to selected categories: Images, PDF, Word, Excel, PowerPoint. If none are selected, any file type is accepted. |

## Notes

- Participants upload one file at a time using a file picker; each uploaded file is listed with an option to remove it before submitting.
- File size and type limits are checked both in the browser and on the server before a file is accepted.
- In the survey editor's response view, uploaded files appear as a download link.
- CSV export lists the file references for a `fileUpload` question but not the file content, and CSV import cannot restore files from those references. To transfer the actual files, use a `.vssp` or `.vssa` export and import; see [Import / Export](/reference/import-export/).

## Common behaviours

File Upload questions can be given a **condition** that controls whether the question is shown, based on a participant's earlier answers. See [Conditional Questions](/reference/survey-editor/conditional-questions/). Each question also has a **code** field used in exports and conditions.
