# veysur-app

## 0.2.0

### Minor Changes

- f63e2ab: Survey templates now carry a category (`templateCategory` front matter, returned as `category` by `GET /survey/template/list`). The "Start from" picker on the new survey form can be browsed by category and filtered with a search box.
- 3424b04: Create a survey from a built-in template. The API ships a library of survey markdown templates (each with a name and description), lists them at `GET /survey/template/list`, and accepts an optional `templateId` on `POST /survey`. The new survey form has a "Start from" picker.

### Patch Changes

- veysur-common@0.2.0
  - veysur-theme@0.2.0

## 0.1.0

Initial tracked release. This is the first self-host release of VeySur; changelog tracking
starts here via [Changesets](https://github.com/changesets/changesets). `veysur-app`,
`veysur-api`, `veysur-common`, `veysur-theme`, and `veysur-docsite` version together
as a single `veysur` release — see `.changeset/README.md`.
