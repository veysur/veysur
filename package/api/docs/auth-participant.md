# Participant Authentication & Authorisation

## Process Overview
When a participant visits a survey URL, the application initiates authentication with the following flow:

## Initial Authentication Request
- **Endpoint**: `POST /api/auth-participant/:survey_id`
- **Request Body**: JSON containing an optional token (if provided)
- **Trigger**: Occurs when a participant accesses a survey URL

## Validation Checks
The endpoint performs multiple validation steps:

1. **Survey Accessibility**: Verifies the survey exists and is accessible
2. **Snapshot Validation**: Ensures a snapshot exists for the specified survey
3. **Publish Date Verification**: Checks survey publish start and end dates
4. **Token Validation**:
   - Validates provided tokens (for token-protected surveys)
   - Skip token validation for 'open' surveys

## Authentication Response
Upon successful validation, the API returns:
- **Response**: A JWT (`JwtParticipant`)
- **Purpose**: This JWT is required for all subsequent API requests involving:
  - Submitting participant answers
  - Retrieving participant answers
  - Retrieving the participant's own profile and attribute values (`GET /survey-participant/:surveyId/me`), used to evaluate display conditions

## JWT Structure & Session Management
The JWT contains a `sessionId` that serves important functions:

### For Open Surveys (No Participant Token)
- **Primary Function**: The `sessionId` enables collation of all submissions from a specific participant
- **Submission Tracking**: Allows answers to be submitted across multiple REST API requests
- **Duplicate Prevention**: Helps prevent multiple submissions by the same participant

### Session Scope Clarification
**Important Note**: The term "session" here refers specifically to a **survey-participant session**, not a browser session.

Key characteristics:
- Each `sessionId` is unique to a specific survey
- Session IDs are **not** reused between different surveys
- The session persists across multiple interactions with the same survey

## Resuming a Started Survey

When a **token-identified** participant re-authenticates (e.g. clicking their
survey link again after saving partial answers), `auth()` doesn't blindly issue
a JWT for whatever publication is currently live — it resolves against the
participant's own in-progress response, so an in-progress response never
becomes unreachable just because the survey was republished:

1. **No in-progress response with a saved answer, or its snapshot matches the
   current live one** — JWT is issued for the current live
   publication/snapshot as normal. A `SurveyResponse` document is created as
   soon as the participant clicks "Start" (see
   `Survey.tsx`'s `handleWelcomeContinue`), before they've answered anything,
   so its mere existence isn't evidence of progress worth resuming — `auth()`
   only treats it as in-progress once `answers` is non-empty. Anyone who
   hasn't saved an actual answer yet always lands on the current live
   publication rather than resuming an earlier one. This
   covers an unchanged-snapshot republish transparently: the participant keeps
   resuming the same response, and their next save refreshes its
   `publicationId` to the new live one (see `ServiceSurveyParticipantResponse.save()`).
2. **In-progress response references a different snapshot, and that snapshot
   still exists** — the JWT is issued for that **original**
   `snapshotId`/`publicationId` instead of the current live one, so the
   participant keeps answering (and can submit) against the survey structure
   they started with, even though it's no longer the live publication.
3. **In-progress response references a different snapshot that no longer
   exists** — there is no structure left to resume the saved answers against.
   The JWT is issued for the current live publication/snapshot (a fresh start)
   and the response includes `reset: true`, which the frontend
   (`appSurvey/hook/useSurveyAuth.ts`) surfaces to the participant as a notice
   that their previous progress couldn't be recovered.

This only applies to token-identified participants (looked up by
`RepoSurveyParticipant`). Anonymous/open-access participants (no token) never
re-hit this endpoint to "return" — the frontend simply keeps using the JWT
(and its `sessionId`) it was already issued, since `auth()` mints a fresh
`sessionId` on every call when no token is supplied.

In practice, case 3 shouldn't be reachable via normal admin actions today —
deleting a publication or snapshot (`ServiceSurveyPublication.deleteMany`,
`ServiceSurveySnapshot.deleteMany`) already cascades to delete any responses
tied to it in the same transaction. The check exists as defence-in-depth.

See also:
- [Publication Response Merge](../../../docs/publication-response-merge.md) —
  a distinct, explicit admin action for consolidating responses across
  snapshots, as opposed to this automatic per-participant resume behaviour.
- [Survey Publishing](../../../docs/survey-publishing.md) — the republishing
  workflow that triggers the scenarios above.