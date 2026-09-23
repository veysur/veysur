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

```bash
tar -xzf veysur-1.2.0.tar.gz && cd veysur
./install.sh
```

`install.sh` offers to install Docker if it is missing, loads any bundled image archives, then runs the two
scripts below. `--yes --domain <domain>` makes it non-interactive. From a source checkout, run the scripts
from `deploy/` instead.

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
Set `VEYSUR_HTTP_PORT` and `VEYSUR_HTTPS_PORT` in the environment of `config-generate.sh` if 80 or 443 are
taken.

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

Back up with `./scripts/backup.sh`, restore with `./scripts/restore.sh`, and move to another server with the two
together. See [maintenance.md](./maintenance.md).

## Build a release package

```bash
./scripts/release-package.sh 1.2.0 --build-images
```

Writes `dist/veysur-1.2.0-with-images.tar.gz` (about 456 MB). Without `--images` the tarball is about 16 KB and
expects `veysur/api` and `veysur/nginx` to be pullable at that tag. `--images` bundles already-built images;
`--build-images` builds them first. No image registry is configured yet, so use the bundled form or load images
yourself.
