---
'veysur-common': minor
'veysur-api': minor
'veysur-app': minor
---

Move the server-only models (`Task`, `TaskExecution`, `EmailSuppression` and their schemas) from the main `veysur-common` index to the new `veysur-common/server` entry point, which `app` may not import. Build the survey leaf models, email documents and event log documents from the schema, and validate them in the API. Remove the deprecated `SurveyLanguage` message fields.
