# veysur

`veysur-app`, `veysur-api`, `veysur-common`, `veysur-theme`, and `veysur-docsite` are
released together under a single version number (see `.changeset/README.md`). This file is
the canonical release history; the identical entry is duplicated into each package's own
`CHANGELOG.md` by [Changesets](https://github.com/changesets/changesets).

## 0.2.0

### Minor Changes

- f63e2ab: Survey templates now carry a category (`templateCategory` front matter, returned as `category` by `GET /survey/template/list`). The "Start from" picker on the new survey form can be browsed by category and filtered with a search box.
- 3424b04: Create a survey from a built-in template. The API ships a library of survey markdown templates (each with a name and description), lists them at `GET /survey/template/list`, and accepts an optional `templateId` on `POST /survey`. The new survey form has a "Start from" picker.
- 7e123b2: Self-hosted installs can keep uploaded files in an S3-compatible service (AWS S3, MinIO). `config-generate.sh` asks for the endpoint, buckets and access key, generates the nginx storage include, and `backup.sh` and `restore.sh` handle installs whose files are not on the local volume. Local disk stays the default.
- 0c3650a: Serve the survey Markdown format specification as a public download at `GET /survey-markdown-spec`, and document generating a survey with an LLM chat bot in the docsite.

### Patch Changes

- 7079c14: Move to Express 5 (via @datacapy/server). The optional `olderThan` segment of the hard file-delete route is now `/hard{/:olderThan}`, and the local storage routes use the named wildcard `/*key`. Request behaviour is unchanged.

## 0.1.0

Initial tracked release: the first self-hostable release of VeySur. Versions before this
point were not maintained.
