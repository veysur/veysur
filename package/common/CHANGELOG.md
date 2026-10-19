# veysur-common

## 0.11.1

No changes in this release.

## 0.11.0

### Minor Changes

- 604457b: Optional bot protection for the survey start step. It is off by default. A project picks a provider (Cloudflare Turnstile, Google reCAPTCHA v3 or VeySur Bot Detection, a built-in proof-of-work check) and switches the bot check on for the project or per survey. Response and file writes need a verified participant token.

  Login also needs a built-in proof-of-work check, on by default, with no setting or third party involved. Set `API_ACCOUNT_BOT_CHECK=false` to turn it off. Scripts that call `POST /auth-email-password/login` directly must fetch a challenge from `POST /bot-protection/challenge`, solve it, and send it as `botCheck`.

- ab02890: Add the map question type model: a single pin answer with exact or approximate precision, an optional country restriction, validation on submission (anonymous surveys accept only approximate pins), CSV export and import, and a project-level Google Maps key that overrides the deployment key.
- ab02890: The statistics page shows a map question as a clustered map of the chosen locations, with the busiest places listed below it.
- ab02890: A map question's starting latitude, longitude and zoom are now optional. Left blank, the map opens on the participant's city, or their country, found from their IP address, or on the world map. Set `API_MAPS_AUTO_LOCATE=false` to turn the lookup off. Anonymous surveys never look the participant up.
- 62c4fed: Open surveys now stop the same browser completing them more than once, using a flag in the browser's local storage, which also works inside embedded surveys. The `preventRepeat` access setting defaults to on and has a switch in the Access settings. The retired `access.repeatCookie` setting, renamed `access.preventRepeat`, is removed from stored data by a migration.
- af85128: Text questions can require an email address, phone number, web address or custom pattern. Phone numbers are checked against the countries the author lists, in national or international format.

### Patch Changes

- ba0b410: The project's Google Maps key and bot-protection settings now live in their own `settingProject` document instead of `settingSurvey`, and the bot-protection secret keys are encrypted at rest. A migration moves existing values and encrypts them, saving a key needs an encryption key to be configured, and the field-encryption rotation task has a second action, `reencryptProjectSettings`, for them. The project settings page saves through `PUT /setting-project/maps` and `PUT /setting-project/bot-protection`, and participant and embed payloads carry the map and bot-check settings as `settingProjectData`.
- ab02890: A map question with no starting view now opens on a guess from the browser's own settings (language region and time zone), never the network address, and opens at street level on the device position when the browser already allows it. Places chosen by search or "Use my location" zoom to street level.
- ab02890: A map question's zoom now applies only together with a starting latitude and longitude, so it no longer overrides the automatic starting view. The editor disables the zoom field until both are set.

## 0.10.1

No changes in this release.

## 0.10.0

### Minor Changes

- aa9a88e: Embed a published survey in another website. The Share tab has an embed card with a copyable script tag and an on/off switch (`access.embed`). The allowed websites (`access.embedDomains`) are set in the Access Control settings, as a project default and per survey, and apply on publish. Publishing writes static, cacheable files (an immutable per-language file per snapshot and a short-lived pointer), so a passive page view makes no API or database call; the participant is authenticated only on their first answer. Only open surveys without public registration or file-upload questions can be embedded. A repair task (`surveyEmbedArtefact.repairAll`) rewrites missing files for surveys published before this release.
- af4bb1a: Add an optional private per-user `maxClients` setting that overrides the default limit of five signed-in clients, clamped between 1 and 100. Add `ServiceImportExport.importFromStream` for importing an archive already in memory, used by seeds and fixtures. It is not exposed through an endpoint.

### Patch Changes

- 6172377: Stop reserving `demo` as a project subdomain, so a deployment can use it for its own demo project.

## 0.9.0

Initial public release. See the [root changelog](../../CHANGELOG.md) for details.
