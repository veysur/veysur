<!-- cspell:ignore mysqldump tarball gzip uroot -->

# Deployment

**Parent:** [README.md](./README.md)

Install, update and operate a self-hosted instance. Requirements: Docker with Compose 2.22 or later, 3 GB RAM,
10 GB free disk, and a domain pointing at the host for public HTTPS.

## Before you start

- **A domain** whose DNS record points at this host. Automatic HTTPS cannot be issued until it resolves.
- **Ports 80 and 443** open to the internet, in the host firewall and any cloud firewall. Only Caddy publishes
  ports; MySQL and Redis stay inside the Docker network.
- **An SMTP relay** and its credentials, for password resets and survey invitations. See [email.md](./email.md).
  You can install without one and add it later.
- **Somewhere to keep backups** away from this server. See [maintenance.md](./maintenance.md).

## Install

Download the latest release from [github.com/veysur/veysur/releases](https://github.com/veysur/veysur/releases),
then:

```bash
tar -xzf veysur-1.2.0.tar.gz && cd veysur
./install.sh
```

`install.sh` offers to install Docker if it is missing, loads any bundled image archives, then runs the two
scripts below. `--yes --domain <domain>` makes it non-interactive. Images are pulled from `ghcr.io/veysur` at
install time; see "Install from source" below to build them locally instead.

1. **`scripts/config-generate.sh`** asks for the domain, TLS mode, administrator e-mail and SMTP relay,
   generates every secret and the field-encryption key pair, and writes `.env` (mode 0600) after showing a diff
   with secrets hidden. It is re-runnable: existing values become the defaults. It also sizes MySQL's memory
   limit and InnoDB buffer pool up automatically on hosts with more than the minimum RAM (see
   [configuration.md](./configuration.md)).
2. **`scripts/deploy.sh`** starts MySQL and Redis, runs migrations, starts the rest and checks `/api/ping`.
   It is idempotent, so re-run it after editing `.env`. `--dry-run` prints the resolved configuration with
   secrets hidden and the pending migrations.

Then create the first account:

```bash
./scripts/admin-account-bootstrap.sh --email you@example.com
```

It prints a generated password once and writes `API_PROJECT_OWNER_ID` to `.env`. Once mail is configured, check it
with `./scripts/veysur.sh mail-test you@example.com`.

Pre-flight refuses to continue below 3 GB RAM or 10 GB free disk (`VEYSUR_SKIP_PREFLIGHT=1` to override).
`deploy.sh` and `update.sh` warn if a published port is already taken. They do not stop.

### Behind a reverse proxy

To run your own proxy on 80 and 443, set `VEYSUR_HTTP_PORT` (and `VEYSUR_HTTPS_PORT`) to free host ports in the
environment of `config-generate.sh`, choose the plain HTTP option, and let the proxy terminate TLS and forward to
`VEYSUR_HTTP_PORT`. Users must still reach the site on the standard ports at `https://<domain>`. Serving users
directly on a non-standard port is not supported: links in emails do not include the port. Use
development mode (`docs/development.md`) for local work on other ports.

The proxy must pass `/embed/` through unchanged. The survey embed pages are framed by other websites, so nginx
sends `frame-ancestors *` for that path only. A proxy that adds `X-Frame-Options` or its own
`Content-Security-Policy` to `/embed/` stops embedded surveys from displaying.

## Install from source

No tarball, no registry pull — clone the repository and build the two images locally:

```bash
git clone https://github.com/veysur/veysur.git && cd veysur/deploy
docker compose build
./scripts/config-generate.sh
./scripts/deploy.sh
./scripts/admin-account-bootstrap.sh --email you@example.com
```

`docker compose build` needs the full source tree (`docker/` and the app/api/common packages), so this only
works from a git checkout, not an extracted release tarball. `deploy.sh` still attempts `compose pull` first;
if it can't reach the registry it warns and falls back to the images just built locally. The `config-generate.sh`
/ `deploy.sh` / `admin-account-bootstrap.sh` steps are the same as in "Install" above.

## Update

Unpack the new release in a new directory, copy `.env` and `certs/` across, and run its `update.sh`. A release
carries the matching `compose.yaml` and scripts, and `update.sh` changes only the image tag, so running the old
directory's copy is not enough. Take a backup first. The full procedure, rollback and what each failure leaves
behind are in [maintenance.md](./maintenance.md#upgrade).

## Operate

```bash
./scripts/veysur.sh status
./scripts/veysur.sh logs api
```

`veysur.sh` also offers `restart`, `stop` and `mail-test`. Anything else is plain `docker compose`. Data lives in
named volumes and survives `stop`; `docker compose down -v` deletes it.

Embedded surveys are served by the bundled nginx: `/embed/loader.js` and the `/embed/` shell, plus static files in the
public bucket. The scheduled `surveyEmbedArtefact` task repairs missing files; see
[embedded-surveys.md](../package/api/docs/embedded-surveys.md).

Back up with `./scripts/backup.sh`, restore with `./scripts/restore.sh`, and move to another server with the two
together. See [maintenance.md](./maintenance.md).

## Build a release package

Releases do this in CI (`.github/workflows/release.yml`, run on each `vX.Y.Z` tag). To build one by hand:

```bash
docker login ghcr.io
./scripts/release-package.sh 1.2.0 --build-images --push
```

Builds `veysur/api` and `veysur/nginx`, pushes them to `ghcr.io/veysur`, and writes the thin
`dist/veysur-1.2.0.tar.gz` (about 16 KB) — installs pull the images from there. `--push` is independent of
`--images`/`--build-images`: add `--images` (bundle already-built images) or `--build-images` (build them
first, implies `--images`) instead of/alongside `--push` to also produce the larger
(~456 MB) `-with-images` variant for air-gapped installs with no registry access.
