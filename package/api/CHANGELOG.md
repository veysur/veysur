# veysur-api

## 0.11.0

### Minor Changes

- 604457b: Optional bot protection for the survey start step. It is off by default. A project picks a provider (Cloudflare Turnstile, Google reCAPTCHA v3 or VeySur Bot Detection, a built-in proof-of-work check) and switches the bot check on for the project or per survey. Response and file writes need a verified participant token.

  Login also needs a built-in proof-of-work check, on by default, with no setting or third party involved. Set `API_ACCOUNT_BOT_CHECK=false` to turn it off. Scripts that call `POST /auth-email-password/login` directly must fetch a challenge from `POST /bot-protection/challenge`, solve it, and send it as `botCheck`.

- f6d27d9: Field-encryption key rotation. Set `API_ENCRYPTION_KEYS` and `API_ENCRYPTION_ACTIVE_KEY_ID` to hold several keys and choose the one used for new values; the existing three variables still work as a single `default` key. A disabled `Field Encryption Rotation` task re-wraps stored values onto the active key. See `package/api/docs/encryption.md`.
- ab02890: Add the map question type model: a single pin answer with exact or approximate precision, an optional country restriction, validation on submission (anonymous surveys accept only approximate pins), CSV export and import, and a project-level Google Maps key that overrides the deployment key.
- ab02890: The statistics page shows a map question as a clustered map of the chosen locations, with the busiest places listed below it.
- ab02890: A map question's starting latitude, longitude and zoom are now optional. Left blank, the map opens on the participant's city, or their country, found from their IP address, or on the world map. Set `API_MAPS_AUTO_LOCATE=false` to turn the lookup off. Anonymous surveys never look the participant up.
- 62c4fed: Open surveys now stop the same browser completing them more than once, using a flag in the browser's local storage, which also works inside embedded surveys. The `preventRepeat` access setting defaults to on and has a switch in the Access settings. The retired `access.repeatCookie` setting, renamed `access.preventRepeat`, is removed from stored data by a migration.
- af85128: Text questions can require an email address, phone number, web address or custom pattern. Phone numbers are checked against the countries the author lists, in national or international format.

### Patch Changes

- ba0b410: The project's Google Maps key and bot-protection settings now live in their own `settingProject` document instead of `settingSurvey`, and the bot-protection secret keys are encrypted at rest. A migration moves existing values and encrypts them, saving a key needs an encryption key to be configured, and the field-encryption rotation task has a second action, `reencryptProjectSettings`, for them. The project settings page saves through `PUT /setting-project/maps` and `PUT /setting-project/bot-protection`, and participant and embed payloads carry the map and bot-check settings as `settingProjectData`.
- ab02890: A map question with no starting view now opens on a guess from the browser's own settings (language region and time zone), never the network address, and opens at street level on the device position when the browser already allows it. Places chosen by search or "Use my location" zoom to street level.
- 93cf6dd: Encrypted fields (the two-factor secret and the bot-protection secret keys) are no longer decrypted on every read. Reads return the stored ciphertext; only two-factor login verification and bot verification decrypt them. Reads that only check whether a secret is set no longer pay for an RSA operation.
- Updated dependencies [ba0b410]
- Updated dependencies [604457b]
- Updated dependencies [ab02890]
- Updated dependencies [ab02890]
- Updated dependencies [ab02890]
- Updated dependencies [ab02890]
- Updated dependencies [ab02890]
- Updated dependencies [62c4fed]
- Updated dependencies [af85128]
  - veysur-common@0.11.0

## 0.10.1

### Patch Changes

- veysur-common@0.10.1

## 0.10.0

### Minor Changes

- aa9a88e: Embed a published survey in another website. The Share tab has an embed card with a copyable script tag and an on/off switch (`access.embed`). The allowed websites (`access.embedDomains`) are set in the Access Control settings, as a project default and per survey, and apply on publish. Publishing writes static, cacheable files (an immutable per-language file per snapshot and a short-lived pointer), so a passive page view makes no API or database call; the participant is authenticated only on their first answer. Only open surveys without public registration or file-upload questions can be embedded. A repair task (`surveyEmbedArtefact.repairAll`) rewrites missing files for surveys published before this release.
- af4bb1a: Add an optional private per-user `maxClients` setting that overrides the default limit of five signed-in clients, clamped between 1 and 100. Add `ServiceImportExport.importFromStream` for importing an archive already in memory, used by seeds and fixtures. It is not exposed through an endpoint.

### Patch Changes

- 28ccd0b: Stop the participant attribute snapshot endpoint returning a server error for an unsupported `lang` query parameter. A value such as `en-GB`, an unknown code or a repeated parameter failed language code validation. It now falls back to the survey's default language.
- cdfd6f4: Stop the bounce processor failing on bounce emails for deleted projects. A bounce that named a project whose database had been dropped raised "Unknown database", was never marked seen, and failed every run. It is now treated as an orphaned project: the suppression is recorded, the message is marked seen and the error is captured once.
- c878052: Pass search text straight to `$regex`: datacapy now treats a string operand as a literal substring match, so the API no longer escapes it (the `escapeRegex` helper is removed). Searching for `_` or `%` no longer acts as a LIKE wildcard.
- 2996e8e: Name the failing IMAP stage in mail canary errors. ImapFlow reports connection, greeting and socket timeouts as a bare "Timeout", which made failed canary runs hard to diagnose. The error now includes the stage (connect, mailbox lock, fetch or delete), the IMAP host and port, and the error code.
- b272a1c: A survey imported from markdown, or created from a template, now gets a language record for each of its languages. Without one, publishing produced a snapshot with no languages and an embedded survey reported itself unavailable. `importFromStream` also accepts an optional `surveyId` for a markdown survey.
- Updated dependencies [aa9a88e]
- Updated dependencies [6172377]
- Updated dependencies [af4bb1a]
  - veysur-common@0.10.0

## 0.9.0

Initial public release. See the [root changelog](../../CHANGELOG.md) for details.
