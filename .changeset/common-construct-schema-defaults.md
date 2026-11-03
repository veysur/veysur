---
'veysur-common': minor
'veysur-api': minor
---

Build model constructors from the schema: ids, defaults and relation fields now come from `SchemaConstructor.from`, and the removed `applyDefaults` options no longer exist. Remove the vestigial section `questionIds` field, with a patch (`2026-11-03_1000_remove-section-question-ids`) that deletes the stored copies from each project database.
