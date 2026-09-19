# Pending survey settings

Survey settings whose UI toggle exists in the Survey model but has no working implementation yet. Hidden from the admin settings UI (commented out, not deleted) so we don't forget to either finish or remove them. Re-enable the JSX once the backing feature is implemented.

## Presentation → Stats (`presentation.stats`)

- **UI**: was in `package/app/src/appAdmin/component/SurveySettingShared/BasePresentationSettings.tsx` (Presentation card), now commented out.
- **Intent**: let participants see survey statistics/response summaries at the end of the survey.
- **Status**: the field is fully plumbed through the Survey model (`SurveyInterface.ts`, `SurveyBase.ts`, `GetterMethods.ts`) and persists correctly, but nothing in the participant-facing survey renderer (`package/app/src/component/Survey/`) reads `presentation.stats` or renders a stats screen. Toggling it currently has zero effect.
- **Not to be confused with**: the admin-side "Stats" sidebar link and `survey.stats` chart-type settings (`package/app/src/appAdmin/component/SurveyStat/`, `surveyStatsOperations.ts`) — that's the results dashboard shown to survey owners, which is fully implemented and unrelated to this participant-facing toggle.
- **To implement**: add a results/stats view to the survey-taking flow (likely a new step after `SurveyThankYou.tsx`), decide what aggregate data is safe to expose to participants, and wire an API endpoint to serve it.

## Data → Response Timings (`data.timings`)

- **UI**: not rendered in `package/app/src/appAdmin/component/SurveySettingShared/BaseDataSettings.tsx` — already removed from JSX (not just commented), guarded by a regression test in `BaseDataSettings.test.tsx` ("does not render the Save Timing Data toggle").
- **Intent**: record per-question/per-page response timing data.
- **Status**: the field is still declared throughout the Survey model (`SurveyInterface.ts`, `SurveyBase.ts`, `GetterMethods.ts`, `SettingSurveyAdapter.ts`) and resolves via the getter, but nothing in `package/api` or the participant-facing survey renderer reads or writes `data.timings` — no timing capture exists on the response-taking side.
- **To implement**: capture timing data during survey taking (per-question or per-page start/end timestamps), persist it against the response, and surface it in the response/export view before re-enabling the toggle.

## Participant → HTML Email (`participant.htmlEmail`)

- **UI**: was in `package/app/src/appAdmin/component/SurveySettingShared/BaseParticipantSettings.tsx` (Emails card), now commented out.
- **Intent**: let survey owners choose whether participant emails (invites, reminders, thank-you) are sent as HTML or plain text.
- **Status**: the field is plumbed through the Survey model and settings UI, but no email-sending code (`ServiceEmail`, `ServiceSurveyCompletionEmail`, invite/reminder senders in `package/api`) branches on it. Contrast with the sibling setting `thankYouEmail`, which _is_ checked (`ServiceSurveyCompletionEmail.ts`).
- **To implement**: add an HTML/plain-text branch to the relevant email-sending services in `package/api/src/model/service/core/ServiceSurveyParticipant/`.

## Process

When disabling a setting for this reason:

1. Comment out the JSX block (don't delete) with a `// <Setting>: hidden until <feature> is implemented — see docs/pending-features.md` note.
2. Add an entry here with the field path, file, intent, and what's missing.
3. Leave the underlying Survey model field in place — removing it would require a migration and there's no benefit until the feature is either built or the field is deliberately dropped.
