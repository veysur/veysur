# Changesets

This directory tracks pending version bumps via [Changesets](https://github.com/changesets/changesets).

`veysur-app`, `veysur-api`, `veysur-common`, `veysur-theme`, and `veysur-docsite` are
[`fixed`](https://github.com/changesets/changesets/blob/main/docs/fixed-packages.md)
together: self-hosters deploy and upgrade them as one unit via `deploy/` (Docker Compose),
so they always version in lockstep under a single `veysur vX.Y.Z` release, even though a
changeset only needs to touch one package's changed behaviour.

We do not publish these packages to npm. "Release" here means: bump every fixed package's
`package.json` version together, write each package's `CHANGELOG.md` entry, tag the repo
`vX.Y.Z`, and cut a GitHub release. See the root `AGENTS.md` "Releases" section for the full
flow.

Read the [Changesets documentation](https://github.com/changesets/changesets/tree/main/docs) for more information.
