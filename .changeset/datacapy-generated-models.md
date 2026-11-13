---
'veysur-common': minor
---

Generate the `ProjectAdmin` and `SettingProject` schemas from tagged interfaces, alongside the `EmailTemplate`, `DataTransferJob` and `UserClient` pilot. The generated `*.schema.ts` files are not edited by hand; `pnpm gen` rewrites them and `pnpm lint` fails if they are stale.

The participant-attribute and survey-language models are generated too.

The server-only `Task`, `TaskExecution` and `EmailSuppression` schemas are generated too. `SchemaTask`, `SchemaTaskExecution` and `SchemaEmailSuppression` keep their `veysur-common/server` exports; the hand-written `taskSpec`, `taskExecutionSpec` and `emailSuppressionSpec` objects are removed.

The `user` schema is generated too. `SchemaUser` no longer takes an `extraSpec` argument: an extension spreads `new SchemaUser().builderFields()` into its own schema of the same name.

The `settingSurvey`, `survey` and `surveySnapshot` schemas are generated too (`SettingSurveyDocument`, `SurveyDocument`, `SurveySnapshotDocument`). The hand-written `SchemaSettingSurvey.ts`, `SchemaSurvey.ts` and `SchemaSurveySnapshot.ts` are removed, along with the `surveyOwnSpec` and `surveySnapshotSpec` exports; the schema classes keep their names and the `veysur-common/model/schema` exports. Array items in those schemas are now required, and `DataTransferJob.options` accepts free-form keys.
