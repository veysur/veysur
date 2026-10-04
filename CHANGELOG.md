# veysur

`veysur-app`, `veysur-api`, `veysur-common`, `veysur-theme`, and `veysur-docsite` are
released together under a single version number (see `.changeset/README.md`). This file is
the canonical release history; the identical entry is duplicated into each package's own
`CHANGELOG.md` by [Changesets](https://github.com/changesets/changesets).

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

### Not included

Billing, subscriptions, platform administration and the Kubernetes deployment belong to the
hosted service and are not part of this repository.
