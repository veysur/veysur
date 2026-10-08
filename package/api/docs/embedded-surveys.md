# Embedded surveys

A published survey can be embedded in another website with a script tag from the Share tab. Design and
trade-offs: `docs/decisions/2026/2026-10-07_embedded-surveys.md` in the VeySur monorepo.

## How a view works

1. `loader.js` (served from `public/embed/`) inserts a lazy iframe pointing at `/embed/<projectId>/<surveyId>`.
2. The shell (`app/src/appSurvey/embed`) fetches two static files from the public bucket and renders the survey
   with no API call: `embed/current.json` (the pointer) and `embed/<snapshotId>/<lang>.json`.
3. On the first answer it calls `POST /auth-participant/:surveyId` with `X-Embed-Origin` (the embedding site),
   then saves responses as normal.

## Files written (`ServiceSurveyEmbedArtefact`)

Public bucket, under `project-<id>/survey/<surveyId>/embed/`:

| File | Content | Changes |
|---|---|---|
| `<snapshotId>/<lang>.json` | merged snapshot survey for one language | never (immutable per snapshot) |
| `current.json` | live snapshot, languages, access, schedule, project survey settings, `noBrandAvailable` | publish, republish, unpublish, project survey settings change, entitlement change |

Written only when the live snapshot has `access.embed` on. The write runs after the publish commits and
never fails it; `refresh()` logs and continues. Old snapshot files are kept for resumed participants and
removed with their snapshot (`removeSnapshots`) or survey (`removeSurvey`).

## Keeping files correct

- `refreshProject({ projectId })` rewrites the pointers of live embed-enabled surveys. `ServiceSettingSurvey.patch`
  calls it; an extension calls it when `isNoBrandAvailable` can change.
- Scheduled task `surveyEmbedArtefact` / `repairAll` (daily, seeded by migration `2026-10-07_1000`) rewrites missing
  files and stale pointers, including surveys published before embedding existed. It reports `failed` for
  `failOnErrorCount`.

## Origin check

The list is the `access.embedDomains` setting: a project default plus an optional per-survey override
(Settings, Access Control), resolved at publish like every access setting. On a survey `null` inherits the project default and `[]` allows any site, which overrides a restrictive default. `ServiceAuthParticipant.auth()` rejects a request with `X-Embed-Origin` when the live snapshot has embedding off
or the site is not in `access.embedDomains` (`isEmbedOriginAllowed`; an entry covers subdomains, and an empty or
missing list means no restriction). The header is never stored. It stops other sites embedding the iframe, not direct API use,
which an open survey allows anyway.

## Security

- **Framing.** Only `/embed/` sends `frame-ancestors *` and no `X-Frame-Options`; every other route keeps
  `SAMEORIGIN`. nginx cannot know a survey's allowed websites, so the API decides.
- **Ancestor origin.** The shell sends `location.ancestorOrigins[0]`, falling back to the referrer origin, and the
  literal `unknown` when neither exists. `unknown` fails any non-empty `embedDomains` list, so a host page cannot
  skip the check by suppressing its referrer. A page can still forge the header in a direct API call; an open survey
  allows that call anyway.
- **Nothing stored.** `X-Embed-Origin` is checked and discarded. Anonymous surveys keep their guarantee: no
  `participantId`, `ip` or `referrerUrl`.
- **Public files.** The embed files sit in the public bucket and are readable by anyone who knows the project and
  survey ids. They hold the published survey content and access settings, never responses or participant data.

## Limits

Open surveys without public registration only. Surveys with a file-upload question show a link to the full
survey instead. Embedded responses do not resume across visits.
