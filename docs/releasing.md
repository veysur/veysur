<!-- cspell:ignore Zenodo zenodo -->

# Releasing

Step-by-step for cutting a `veysur` release with `scripts/release.sh`. For what a changeset is,
how the packages are grouped and what the script does internally, see [versioning.md](./versioning.md).

Run every command from the `veysur` repo root unless a block says otherwise.

## Before you start

- You are on `master`, in sync with `origin/master`, with a clean working tree.
- `gh auth status` shows you signed in. The script runs the CI checks and publishes the release through `gh`.
- At least one pending changeset exists in `.changeset/`. Without one the script stops.
- `CITATION.cff` is current if the title, author, licence or abstract changed. Zenodo reads it when the release is published.

Check what will go into the release:

```bash
ls .changeset/*.md
git log "$(git describe --tags --abbrev=0)"..HEAD --oneline
```

A user-facing change with no changeset will be missing from the changelog. Add one with `pnpm changeset`, commit it and push it before continuing.

`release.sh` also runs `scripts/release-check-changesets.sh`, which lists `feat`/`fix` commits since the last tag that add no changeset
and asks whether to continue. It is a warning, not a block: a changeset added in a separate commit is not recognised, and nothing is asked when there is no terminal.

## 1. Release the submodule libraries (only if they changed)

`datacapy` and `s3-adaptor` release first, because `veysur` pins their commits. Skip a library with no pending changesets.

`release.sh` enforces this through `scripts/release-check-submodules.sh`, which stops the release and prints the steps below
when a library has a pending changeset at the commit `veysur` pins, or on its `origin/master`. You can run it on its own at any time.
A pinned commit that is only behind `origin/master` (for example dependency bumps with no changeset) is reported, not blocked.

```bash
# cd external/s3-adaptor
./scripts/release.sh
./scripts/publish.sh --dry-run
./scripts/publish.sh
```

`datacapy` is the same, from `external/datacapy`. `publish.sh` needs `npm login` and prompts for a one-time password.
Each `release.sh` ends by printing a `gh release create` command; run it to create that library's GitHub release.

Then record the new pointers in `veysur` and refresh the lockfile:

```bash
git add external/datacapy external/s3-adaptor
pnpm install
git add pnpm-lock.yaml
git commit -m "chore(deps): bump submodules"
git push
```

## 2. Dry run

```bash
./scripts/release.sh --dry-run
```

This runs the pre-flight checks and the `release-check.yml` image build in CI, then stops. Nothing is versioned, tagged or published.
Do this after any dependency or submodule bump.

## 3. Cut the release

```bash
./scripts/release.sh
```

The script then runs on its own:

1. Pre-flight checks, then the `release-check.yml` build. A failure here changes nothing.
2. `changeset version` bumps the five fixed-group packages together and the root `package.json` follows.
3. The root `CHANGELOG.md` entry is written, committed as `chore(release): vX.Y.Z`, tagged `vX.Y.Z` and pushed.
4. A draft GitHub release is created with that changelog entry as its notes.
5. The tag push starts `release.yml`, which builds the images and tarballs, tests them, and only then pushes the `api` and `nginx` images to GHCR (also tagged `latest`) and attaches the tarballs to the draft. The test job installs the thin package on a clean runner (`deploy/tests/release-smoke.sh`) and a failure there pushes nothing. It then upgrades the previous release to the new images (`deploy/tests/release-upgrade.sh`), and a failed update or data check also pushes nothing.
6. When `release.yml` succeeds, the script publishes the draft.

Publishing the release is what triggers the Zenodo archive and DOI.

## 4. Verify

- The release is public and marked latest: `gh release view --web`.
- It carries `veysur.tar.gz` and `veysur-with-images.tar.gz` among its assets.
- The images exist: `docker pull ghcr.io/veysur/api:X.Y.Z` (and `nginx`).
- The new version appears on Zenodo within a few minutes. If not, check the repo toggle at zenodo.org/account/settings/github.

## What gates a release

`release.yml` builds the images and tarballs, tests them, and publishes only if every test passes. The tests run in `deploy/tests/` against the built artefacts, never the repository checkout:

| Test | Proves |
|---|---|
| `release-smoke.sh` | A fresh install of the thin package starts: ping, app shells, admin login, container health. It then creates, publishes, answers and exports a survey, round-trips files, and restores a backup. |
| `release-upgrade.sh` | The previous release upgrades with `update.sh`, keeps its data, and a failed update rolls back. Skipped for the first release. |
| `release-smoke.sh --browser` | The admin and survey apps work in Chromium. Not a gate yet: it runs as a non-blocking job until it has been stable for ten consecutive runs. |

`release-smoke.yml` runs the same tests on pull requests that touch `deploy/`, and nightly against `master` and against the latest published release. The images are single-architecture (`linux/amd64`), so there is no arm64 run.

Run them locally with Docker, `curl` and `jq`. Build the thin package first, then pass it in:

```bash
deploy/scripts/release-package.sh 0.0.0-smoke
deploy/tests/release-smoke.sh --tarball deploy/dist/veysur-0.0.0-smoke.tar.gz
deploy/tests/release-upgrade.sh --from-tarball <previous veysur-X.Y.Z.tar.gz>
```

Both print the container state and logs on the first failed check. After a failed `release.yml`, fix the cause and re-run it with the command under "If something fails"; nothing was pushed, so it is safe to repeat.

## If something fails

| Failure | State | What to do |
|---|---|---|
| Pre-flight or `release-check.yml` | Nothing changed | Fix the cause and re-run. |
| `release.yml` after the tag push | Release is a private draft; no images pushed if a test failed | Fix the cause, then re-run the workflow and publish the draft. |

```bash
gh workflow run release.yml -f version=X.Y.Z
gh run watch -R veysur/veysur
gh release edit vX.Y.Z --draft=false --latest
```

If the fix changes the tagged commit, move the tag first (`git tag -f vX.Y.Z`, then `git push -f origin vX.Y.Z`).
That is safe only while the release is a draft.

## One-time setup

The first workflow run creates the `api` and `nginx` packages under `ghcr.io/veysur` as private.
Set them to public in GitHub's package settings, or self-hosters pulling without credentials get 401s.
