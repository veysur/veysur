# veysur

`veysur-app`, `veysur-api`, `veysur-common`, `veysur-theme`, and `veysur-docsite` are
released together under a single version number (see `.changeset/README.md`). This file is
the canonical release history; the identical entry is duplicated into each package's own
`CHANGELOG.md` by [Changesets](https://github.com/changesets/changesets).

## 0.12.0

### Minor Changes

- f4f2011: Add an optional Marketing cookie category and an extra gtag destination registry slot. Both are inert unless an extension registers marketing cookies or destinations. Existing visitors see the consent banner once more because the stored consent shape changed.

### Patch Changes

- b5a48dc: Reload the user's projects before the "already logged in" screen decides whether the target project is authorised, so a stale session snapshot no longer offers a Continue button that ends on a permission error.
- 3939976: Keep the router base path in the return URL when an unauthenticated visitor is sent to the auth domain, so switching projects lands back in the admin app instead of the public survey app.
- 4b38dd4: Disable the file upload question in the admin survey preview and show a hint that files are not saved there, instead of a picker that silently does nothing.

## 0.11.1

### Patch Changes

- bbd3702: Refresh the lockfile so the release image build installs with a frozen lockfile.

## 0.11.0

### Minor Changes

- 604457b: Optional bot protection for the survey start step. It is off by default. A project picks a provider (Cloudflare Turnstile, Google reCAPTCHA v3 or VeySur Bot Detection, a built-in proof-of-work check) and switches the bot check on for the project or per survey. Response and file writes need a verified participant token.
- 0ad8e3b: The embed loader accepts a `data-lazy` attribute that holds the survey iframe's `src` back until it is within about 300px of the viewport.
- ab02890: A map question's starting latitude, longitude and zoom are now optional. Left blank, the map opens on the participant's city, or their country, found from their IP address, or on the world map. Set `API_MAPS_AUTO_LOCATE=false` to turn the lookup off. Anonymous surveys never look the participant up.
- 62c4fed: Open surveys now stop the same browser completing them more than once, using a flag in the browser's local storage, which also works inside embedded surveys. The `preventRepeat` access setting defaults to on and has a switch in the Access settings. The retired `access.repeatCookie` setting, renamed `access.preventRepeat`, is removed from stored data by a migration.
- af85128: Text questions can require an email address, phone number, web address or custom pattern. Phone numbers are checked against the countries the author lists, in national or international format.
- f6d27d9: Field-encryption key rotation. Set `API_ENCRYPTION_KEYS` and `API_ENCRYPTION_ACTIVE_KEY_ID` to hold several keys and choose the one used for new values; the existing three variables still work as a single `default` key. A disabled `Field Encryption Rotation` task re-wraps stored values onto the active key. See `package/api/docs/encryption.md`.

### Patch Changes

- ba0b410: The project's Google Maps key and bot-protection settings now live in their own `settingProject` document instead of `settingSurvey`, and the bot-protection secret keys are encrypted at rest. A migration moves existing values and encrypts them, saving a key needs an encryption key to be configured, and the field-encryption rotation task has a second action, `reencryptProjectSettings`, for them. The project settings page saves through `PUT /setting-project/maps` and `PUT /setting-project/bot-protection`, and participant and embed payloads carry the map and bot-check settings as `settingProjectData`.
- ab02890: A map question's zoom now applies only together with a starting latitude and longitude, so it no longer overrides the automatic starting view. The editor disables the zoom field until both are set.
- 93cf6dd: Encrypted fields (the two-factor secret and the bot-protection secret keys) are no longer decrypted on every read. Reads return the stored ciphertext; only two-factor login verification and bot verification decrypt them. Reads that only check whether a secret is set no longer pay for an RSA operation.

## 0.10.1

### Patch Changes

- 34fca81: Refresh the lockfile so the release workflow can build the container images. The 0.10.0 release published no images or tarballs because the lockfile did not match the docsite manifest.

## 0.10.0

### Minor Changes

- 340308f: Let a host page choose the embedded survey's theme. The loader accepts `data-theme` (`light`, `dark` or `auto`) and exposes `window.VeySurEmbed.setTheme()` for live changes. The embed no longer reads the shared theme cookie, so it is light unless the host asks otherwise.
- aa9a88e: Embed a published survey in another website. The Share tab has an embed card with a copyable script tag and an on/off switch (`access.embed`). The allowed websites (`access.embedDomains`) are set in the Access Control settings, as a project default and per survey, and apply on publish. Publishing writes static, cacheable files (an immutable per-language file per snapshot and a short-lived pointer), so a passive page view makes no API or database call; the participant is authenticated only on their first answer. Only open surveys without public registration or file-upload questions can be embedded. A repair task (`surveyEmbedArtefact.repairAll`) rewrites missing files for surveys published before this release.
- 302b339: Add a `loginDefaults` registry slot that lets an extension pre-fill the login form. Without an extension registered the form starts empty, as before.
- af4bb1a: Add an optional private per-user `maxClients` setting that overrides the default limit of five signed-in clients, clamped between 1 and 100. Add `ServiceImportExport.importFromStream` for importing an archive already in memory, used by seeds and fixtures. It is not exposed through an endpoint.

### Patch Changes

- 88c981a: Fix the drag animation in the survey editor structure panel. Items at the drop position were pushed far out of place because a move was applied twice, once by the live reorder and again by the sorting animation. Moves within a group now animate neighbours and apply on drop, the dragged item leaves a dashed placeholder at the drop slot, and the item under the pointer stays visible through a semi-transparent drag preview.
- b23dc3a: Show the number of sections in the survey list as the count of section ids. A survey imported from markdown without a welcome or thank-you section previously showed -1.
- 28ccd0b: Stop the participant attribute snapshot endpoint returning a server error for an unsupported `lang` query parameter. A value such as `en-GB`, an unknown code or a repeated parameter failed language code validation. It now falls back to the survey's default language.
- cdfd6f4: Stop the bounce processor failing on bounce emails for deleted projects. A bounce that named a project whose database had been dropped raised "Unknown database", was never marked seen, and failed every run. It is now treated as an orphaned project: the suppression is recorded, the message is marked seen and the error is captured once.
- c878052: Pass search text straight to `$regex`: datacapy now treats a string operand as a literal substring match, so the API no longer escapes it (the `escapeRegex` helper is removed). Searching for `_` or `%` no longer acts as a LIKE wildcard.
- 2996e8e: Name the failing IMAP stage in mail canary errors. ImapFlow reports connection, greeting and socket timeouts as a bare "Timeout", which made failed canary runs hard to diagnose. The error now includes the stage (connect, mailbox lock, fetch or delete), the IMAP host and port, and the error code.
- b272a1c: A survey imported from markdown, or created from a template, now gets a language record for each of its languages. Without one, publishing produced a snapshot with no languages and an embedded survey reported itself unavailable. `importFromStream` also accepts an optional `surveyId` for a markdown survey.
- 6172377: Stop reserving `demo` as a project subdomain, so a deployment can use it for its own demo project.

## 0.9.0

Initial public release of the self-hostable core of VeySur.

VeySur has been in development for more than a year and has run in production for the hosted
service for a few months. This release is that same code base, published as source-available
software you can run on your own server. The git history in this repository starts in
September 2026 because it was seeded from a private repository; it does not show the earlier
development.

The version is 0.9.0 rather than 1.0.0 on purpose. The software is in real use, but the
public API, configuration format and upgrade path have not yet been exercised by outside
self-hosters. 1.0.0 will mark the point where those are stable and breaking changes follow
semantic versioning.

### What is included

- Survey editor with groups, questions, content elements and multi-language support.
- Survey templates, browsable by category, and survey generation from Markdown (including with an LLM chat bot).
- Publishing, participant management, response collection and anonymous surveys.
- Import and export of surveys, publications and answers.
- Self-hosting with Docker Compose, including generated configuration, TLS, backup and restore.
- File storage on local disk or an S3-compatible service (AWS S3, MinIO).
- The admin guide docsite.
