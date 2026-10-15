# veysur

`veysur-app`, `veysur-api`, `veysur-common`, `veysur-theme`, and `veysur-docsite` are
released together under a single version number (see `.changeset/README.md`). This file is
the canonical release history; the identical entry is duplicated into each package's own
`CHANGELOG.md` by [Changesets](https://github.com/changesets/changesets).

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
