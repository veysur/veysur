---
'veysur-api': minor
'veysur-app': minor
---

Create a survey from a built-in template. The API ships a library of survey markdown templates (each with a name and description), lists them at `GET /survey/template/list`, and accepts an optional `templateId` on `POST /survey`. The new survey form has a "Start from" picker.
