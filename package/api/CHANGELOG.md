# veysur-api

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
