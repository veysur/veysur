# veysur-app

## 0.10.1

### Patch Changes

- 34fca81: Refresh the lockfile so the release workflow can build the container images. The 0.10.0 release published no images or tarballs because the lockfile did not match the docsite manifest.
- veysur-common@0.10.1
  - veysur-theme@0.10.1

## 0.10.0

### Minor Changes

- 340308f: Let a host page choose the embedded survey's theme. The loader accepts `data-theme` (`light`, `dark` or `auto`) and exposes `window.VeySurEmbed.setTheme()` for live changes. The embed no longer reads the shared theme cookie, so it is light unless the host asks otherwise.
- aa9a88e: Embed a published survey in another website. The Share tab has an embed card with a copyable script tag and an on/off switch (`access.embed`). The allowed websites (`access.embedDomains`) are set in the Access Control settings, as a project default and per survey, and apply on publish. Publishing writes static, cacheable files (an immutable per-language file per snapshot and a short-lived pointer), so a passive page view makes no API or database call; the participant is authenticated only on their first answer. Only open surveys without public registration or file-upload questions can be embedded. A repair task (`surveyEmbedArtefact.repairAll`) rewrites missing files for surveys published before this release.
- 302b339: Add a `loginDefaults` registry slot that lets an extension pre-fill the login form. Without an extension registered the form starts empty, as before.

### Patch Changes

- 88c981a: Fix drag and drop in the survey editor structure panel. Items at the drop position were pushed far out of place while dragging. The dragged item now leaves a dashed placeholder at the drop position and the drag preview is semi-transparent.
- 88c981a: Fix the drag animation in the survey editor structure panel. Items at the drop position were pushed far out of place because a move was applied twice, once by the live reorder and again by the sorting animation. Moves within a group now animate neighbours and apply on drop, the dragged item leaves a dashed placeholder at the drop slot, and the item under the pointer stays visible through a semi-transparent drag preview.
- b23dc3a: Show the number of sections in the survey list as the count of section ids. A survey imported from markdown without a welcome or thank-you section previously showed -1.
- Updated dependencies [aa9a88e]
- Updated dependencies [6172377]
- Updated dependencies [af4bb1a]
  - veysur-common@0.10.0
  - veysur-theme@0.10.0

## 0.9.0

Initial public release. See the [root changelog](../../CHANGELOG.md) for details.
