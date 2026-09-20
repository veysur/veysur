# Events Catalogue

All event actions tracked by the API, grouped by category.

**Data source key:**
- `account` — written to the account DB (no `projectId` on the log call)
- `project` — written to the project's own DB (`projectId` passed to `log()`)

Metadata fields marked `†` are redacted before storage — see [event-log.md](event-log.md#metadata-redaction).

## Authentication

| Action | Data source | Metadata | Service |
|---|---|---|---|
| `user.login` | account | — | ServiceAuthEmailPassword |
| `user.login.2fa` | account | — | ServiceTwoFactor |
| `user.login.2fa.setup` | account | — | ServiceTwoFactor |
| `user.logout` | account | — | ServiceAuth |
| `user.2fa.enabled` | account | — | ServiceTwoFactor |
| `user.2fa.disabled` | account | — | ServiceTwoFactor |
| `user.sessionsRevoked` | account | — | ServiceAuth |
| `user.accountDeleted` | account | — | ServiceUser |
| `user.accountRestored` | account | — | ServiceUser |
| `user.anonymized` | account | — | ServiceUser |

## User Profile

| Action | Data source | Metadata | Service |
|---|---|---|---|
| `user.email.updated` | account | `email`† | ServiceUser |
| `user.name.updated` | account | `nameFirst`, `nameLast` | ServiceUser |
| `user.password.updated` | account | — | ServiceUser |
| `user.password.reset` | account | — | ServicePassword |

## Projects

| Action | Data source | Metadata | Service |
|---|---|---|---|
| `project.created` | account | `projectId` | ServiceProject |
| `project.updated` | project | `fields[]` | ServiceProject |
| `project.deleted` | account | `projectId` | ServiceProject |
| `project.restored` | account | `projectId` | ServiceProject |
| `project.anonymized` | account | `projectId` | ServiceProject |
| `project.anonymizedImmediately` | account | `projectId` | ServiceProject |

## Surveys

| Action | Data source | Metadata | Service |
|---|---|---|---|
| `survey.created` | project | `surveyId` | ServiceSurvey |
| `survey.published` | project | `surveyId`, `publicationId`, `snapshotId` | ServiceSurveyPublication |
| `survey.republished` | project | `surveyId`, `snapshotId`, `publicationId` | ServiceSurveyPublication |
| `survey.unpublished` | project | `surveyId` | ServiceSurveyPublication |

## Responses

| Action | Data source | Metadata | Service |
|---|---|---|---|
| `response.submitted` | project | `surveyId`, `publicationId`, `snapshotId` | ServiceSurveyParticipantResponse |
