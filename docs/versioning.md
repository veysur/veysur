# Versioning and releases

How `veysur` and its two submodule libraries (`mzen`, `s3-adaptor`) are versioned, and the
step-by-step for cutting a release. The release artefact is a git tag plus a GitHub release
either way; none of these packages are currently published to npm, though the library
packages (everything except the workspace-root `package.json`s and `veysur-app`) carry no
`private` field, so `npm publish` isn't blocked if that changes.

## Overview

| Repo | Versioning model | Tag format | Config |
|---|---|---|---|
| `veysur` (this repo) | `fixed` group: `veysur-app`, `veysur-api`, `veysur-common`, `veysur-theme`, `veysur-docsite` always bump together | `vX.Y.Z` | `.changeset/config.json` |
| `external/mzen` | Independent per package (`mzen-id`, `mzen-migrate`, `mzen-om`, `mzen-schema`, `mzen-server`) | `<package-name>@X.Y.Z` | `external/mzen/.changeset/config.json` |
| `external/s3-adaptor` | Single package | `s3-adaptor@X.Y.Z` | `external/s3-adaptor/.changeset/config.json` |

All three use [Changesets](https://github.com/changesets/changesets). The workspace-root
`package.json` in `veysur` and `mzen` (not a real consumable package, just orchestration
scripts) and `veysur-app` (a bundled application, not a library) stay `private: true`; every
other package here is consumed both via the pnpm `workspace:*` protocol internally and is
publishable to npm in principle. Each `.changeset/config.json` sets `"privatePackages": {
"version": true, "tag": true }` so Changesets still manages the few packages that remain
private, and `"access": "public"` since none of these package names are npm-scoped
(`restricted` access only works for a scoped `@org/pkg` name).

`veysur`'s five packages version together because self-hosters deploy and upgrade them as
one unit via `deploy/` (Docker Compose): they never pin `app` and `api` to different
versions from each other.

## Day to day: adding a changeset

When a PR changes a package's behaviour, add a changeset in that package's repo:

```bash
pnpm changeset
```

Pick the affected package(s) (in `veysur`, picking any one of the fixed-group packages bumps
all five together), the bump level (patch/minor/major), and write the changelog summary.
Commit the generated `.changeset/*.md` file with the PR.

## Cutting a release

Releases are cut in dependency order, since `veysur`'s `pnpm-lock.yaml` and submodule
pointers need to reflect `mzen`/`s3-adaptor`'s latest tagged commit:

1. **`external/mzen`** (if it has pending changesets): `cd external/mzen && ./scripts/release.sh`.
   Bumps whichever `mzen-*` packages changed, commits, tags each
   `<package-name>@<version>`, pushes.
2. **`external/s3-adaptor`** (if it has pending changesets): `cd external/s3-adaptor &&
   ./scripts/release.sh`. Bumps, commits, tags `s3-adaptor@<version>`, pushes.
3. In `veysur`'s own root, `git add external/mzen external/s3-adaptor` to pick up the new
   submodule pointers if either was released, then `pnpm install` to refresh the lockfile.
4. **`veysur`** (if it has pending changesets): `./scripts/release.sh`. Bumps all five
   packages together, syncs the root `package.json` version, commits, tags `vX.Y.Z`, pushes.

Each `scripts/release.sh` prints a `gh release create` command as its last step. Run it
(one per tag) to cut the actual GitHub release from that package's `CHANGELOG.md` entry.

`scripts/release.sh` in each repo does the mechanical part only (version bump, commit, tag,
push); it refuses to run with pending working-tree changes or with no changesets staged.
This is a manual, maintainer-triggered flow: there's no CI release automation yet.

## Onboarding a new package

Adding a package to any of these three repos (a new `mzen-*` library, or a 6th `veysur` core
package):

1. Decide its versioning model: does it belong to `veysur`'s `fixed` group (ships and
   upgrades with the other five, e.g. another package self-hosters deploy directly), or does
   it get independent semver like an `mzen-*` package (a standalone library other code
   depends on, that can change on its own schedule)?
2. If it's joining an existing `fixed` group, add its `name` to that repo's
   `.changeset/config.json` `fixed` array.
3. If it's a new independent-semver repo (a new submodule, following the `mzen`/`s3-adaptor`
   pattern): add `@changesets/cli` as a dev dependency, scaffold `.changeset/config.json`
   and `.changeset/README.md` (copy an existing one as a template). If the package is
   `private: true` (an application, not a library meant to be depended on), confirm
   `privatePackages.version: true` is set, or `changeset version` will silently skip it.
4. If it has its own `package.json` with no sibling `package/*` packages (like
   `s3-adaptor`), give it its own `pnpm-workspace.yaml` with `packages: []` so pnpm and
   Changesets treat it as its own workspace root rather than resolving into `veysur`'s
   parent workspace: this was a real bug hit when `s3-adaptor` first adopted Changesets.
5. Add a `release` scope to `.cz-config.js` if `allowCustomScopes: false` there.
6. Add a baseline `CHANGELOG.md` (`## 0.1.0` / current version, "Initial tracked release").
7. Copy `scripts/release.sh` from a sibling repo with the matching versioning model
   (`veysur`'s for a fixed group, `mzen`'s for independent-per-package, `s3-adaptor`'s for a
   single package) and adjust the tag format if needed.
8. Add it to the overview table above.
