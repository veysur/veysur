<!-- cspell:ignore mysqldump tarball gzip uroot -->

# Deployment

**Parent:** [README.md](./README.md)

Install, update and operate a self-hosted instance. Requirements: Docker with Compose 2.22 or later, 4 GB RAM,
10 GB free disk, and a domain pointing at the host for public HTTPS.

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
   with secrets hidden. It is re-runnable: existing values become the defaults.
2. **`scripts/deploy.sh`** starts MySQL and Redis, runs migrations, starts the rest and checks `/api/ping`.
   It is idempotent, so re-run it after editing `.env`. `--dry-run` prints the resolved configuration with
   secrets hidden and the pending migrations.

Then create the first account:

```bash
./scripts/admin-account-bootstrap.sh --email you@example.com
```

It prints a generated password once and writes `API_PROJECT_OWNER_ID` to `.env`.

Pre-flight refuses to continue below 4 GB RAM or 10 GB free disk (`VEYSUR_SKIP_PREFLIGHT=1` to override).
Set `VEYSUR_HTTP_PORT` and `VEYSUR_HTTPS_PORT` in the environment of `config-generate.sh` if 80 or 443 are
taken.

## Update

```bash
./scripts/update.sh --tag 1.3.0
```

Forward-only. It pulls the new images (or loads `*.tar` archives with `--offline <dir>`), snapshots every
database to `backups/` (aborting if that fails), runs migrations, recreates the containers and checks health.

- **Unhealthy release:** the previous tag is re-pinned in `.env` and started again.
- **Failed migration:** the tag is restored and the snapshot is the recovery path; restore it with
  `gunzip -c backups/<file>.sql.gz | docker compose exec -T mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD"'`.
- **Skipping a major version** needs `--force`.

## Operate

```bash
./scripts/veysur.sh status
./scripts/veysur.sh logs api
```

`veysur.sh` also offers `restart` and `stop`. Anything else is plain `docker compose`. Data lives in named
volumes and survives `stop`; `docker compose down -v` deletes it.

## Build a release package

```bash
./scripts/release-package.sh 1.2.0 --build-images
```

Writes `dist/veysur-1.2.0-with-images.tar.gz` (about 456 MB). Without `--images` the tarball is about 16 KB and
expects `veysur/api` and `veysur/nginx` to be pullable at that tag. `--images` bundles already-built images;
`--build-images` builds them first. No image registry is configured yet, so use the bundled form or load images
yourself.
