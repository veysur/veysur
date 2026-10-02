# Trunk-based development

## Why trunk-based

- **Fewer painful merges.** Short-lived branches stay close to `master`, so conflicts are small
  and found early.
- **Faster feedback.** Changes are integrated and tested continuously, not in a large batch at
  the end.
- **Smaller, safer changes.** Small PRs are easier to review and cheap to revert.
- **Always a releasable state.** `master` can be released at any time, so releases are routine
  rather than events.
- **Less process overhead.** One main line, with no long-lived `develop` or feature branches to
  keep in sync.

## Overview

How changes flow into `veysur`. `master` is the trunk. Every change reaches it through a
short-lived pull request, and releases are tags cut from it (see [versioning.md](./versioning.md)).

Mandatory pull requests and trunk-based development are compatible. The conflict is with
long-lived branches, not with review. Keep PRs small and short-lived (hours to days, not weeks)
and the workflow is still trunk-based.

## Rules

- **`master` is the trunk and is always releasable.** Everything merges there. There is no
  `develop` branch.
- **Branch from `master`, merge back to `master`.** Branches live for hours to days. Rebase or
  merge `master` into a branch that is going stale, or close it and start again.
- **One logical change per PR.** Small PRs get reviewed faster and are cheaper to revert.
- **CI gates every PR.** Lint, type-check and tests must pass before merge. Automate everything
  that needs no judgement: CI, CLA check, stale-PR closing, and a merge queue where available.
- **Squash merge.** One commit per change keeps `master` linear and each change revertable on
  its own. Follow the conventional-commit format in [CONTRIBUTING.md](../CONTRIBUTING.md).
- **Unfinished work merges behind a flag.** If a feature cannot land in one short PR, split it
  and hide the incomplete part behind a feature flag or an unreferenced code path, rather than
  holding a branch open.
- **Revert fast.** If a merged change breaks `master`, revert it first and fix forward in a new
  PR. A revert is a normal, blame-free outcome.

## Releases

Releases are tags on `master`, each with a GitHub release and its build artefacts. No branch is needed for the normal case.

| Situation | What to do |
|---|---|
| Normal release | Cut it from `master` with `scripts/release.sh` (version bump, commit, tag), then create the GitHub release and attach the operator tarball. See [versioning.md](./versioning.md#cutting-a-release). |
| Stabilisation window | Cut a short-lived `release/x.y` branch from `master` at the freeze. Only fixes go in. Release from it as above. Do not merge it back to `master`. Delete the branch afterwards; the tag keeps the release commit reachable. |
| Several supported versions | Keep a long-lived `release/x.y` branch per supported version. It receives cherry-picked fixes only. |
| Hotfix | Land the fix on `master` first, then cherry-pick it onto each affected release branch. |

A release made from a branch is tagged on the branch, so that tag is not on `master`'s history.
That is expected. Every fix on the branch already exists on `master` (it landed there first),
so nothing needs merging back. The one exception is the commit `scripts/release.sh` creates (version
bump, `CHANGELOG.md` entry, consumed changesets removed). Cherry-pick that commit onto `master`
after releasing, otherwise `master` keeps the old version and re-releases the same pending
changesets.

The cherry-pick can conflict, typically in `CHANGELOG.md` and the `package.json` versions, if
`master` has released a newer version since the branch was cut. Resolve by outcome, not by
taking either side:

- Keep the higher version in every `package.json`. Never let the cherry-pick lower it.
- Keep both `CHANGELOG.md` sections, in version order, so the older release sits below the newer.
- Make sure the changesets the branch release consumed are deleted on `master`, so they are
  not released twice.

Never let a release branch become a new `develop`. Features are not developed on it, and nothing
lands there that is not already on `master`.

## Handling review load

Maintainer attention is the scarce resource, so the aim is fast decisions rather than a long
queue.

- **Triage quickly and close quickly.** A closed PR costs no further attention. A PR left
  waiting costs attention indefinitely.
- **Separate triage from review.** A rotating triager filters new PRs (CLA signed, CI green,
  scope clear) so reviewers only see PRs that are ready.
- **Tier contributors.** Trusted contributors can have routine changes auto-merged once CI
  passes. PRs from unknown contributors are triaged before they are reviewed.
- **Merge more freely, gate the release.** Because reverting is cheap, review exists to catch
  real problems, not to guard `master` against every possible mistake. The release tag is the
  gate.
- **If intake exceeds capacity, accept fewer contributions, faster.** Declining quickly is
  better than accepting everything slowly.
