# deploy

The Docker Compose stack for running VeySur. Full documentation is in [`../docs/`](../docs/README.md).

## Quickstart

```bash
./scripts/config-generate.sh                          # asks a few questions, writes .env
./scripts/deploy.sh                                   # migrates and starts everything
./scripts/admin-account-bootstrap.sh --email you@example.com
```

From a release tarball, run `./install.sh` instead of the first two lines. Back up with `./scripts/backup.sh`.
See [deployment](../docs/deployment.md) to install and [maintenance](../docs/maintenance.md) to upgrade, restore
or move to another server.

## What is here

| Path | Purpose |
|---|---|
| `compose.yaml` | The production stack: Caddy, nginx, API, task manager, MySQL, Redis, one-shot `migrate` |
| `compose.dev.yaml` | Contributor overlay, see [development](../docs/development.md) |
| `nginx.conf`, `nginx.dev.conf` | Single-origin routing for production and development |
| `nginx/` | File-storage includes: `storage-local.conf`, plus a generated `storage-s3.conf` in S3 mode, see [storage](../docs/storage.md) |
| `tests/` | `storage.test.sh` (fast helper checks) and `storage-s3.e2e.sh` (full stack against a throwaway S3 service) |
| `caddy/` | Front-door config and the four TLS snippets, see [tls](../docs/tls.md) |
| `mysql/` | Server config and first-start grants |
| `docker/` | `Dockerfile.api`, `Dockerfile.nginx` (production) and `Dockerfile.dev` |
| `scripts/` | `config-generate`, `deploy`, `update`, `backup`, `restore`, `admin-account-bootstrap`, `veysur`, `release-package` |
| `install.sh` | Top-level installer used from the release tarball |
| `.env.example` | Every configuration key, see [configuration](../docs/configuration.md) |

Build the images from the repository root:

```bash
docker build -f deploy/docker/Dockerfile.api -t ghcr.io/veysur/api .
docker build -f deploy/docker/Dockerfile.nginx -t ghcr.io/veysur/nginx .
```

Or, more simply, `docker compose build` from `deploy/` — see [deployment.md](../docs/deployment.md#install-from-source).

## Testing storage

```bash
./tests/storage.test.sh      # seconds; validation and generated nginx config
pnpm test:storage            # minutes; from the repository root
```

`storage-s3.e2e.sh` builds the images, copies this directory to a temporary one, and starts a separate Compose
project (`veysur-s3test-*`) on free ports with a throwaway S3 service. It uploads and reads public and private
files through nginx, checks signed links, deletion, backup and restore, changes buckets, rejects bad
configuration and finally switches to local storage. It stops at the first failure and prints the nginx and API
logs. Everything is removed afterwards, so it is safe next to a real install.

| Option | Effect |
|---|---|
| `--skip-build` | Reuse the images from an earlier run |
| `--registry <r> --tag <t>` | Use published images instead of building |
| `--keep` | Leave the stack running and print the `teardown.sh` that removes it |
| `--skip-local` | Skip the final local-storage run |
| `--port <n>` | Use this host port for the site |
| `--clean-images` | Remove the images this run built |

It needs Docker with the compose plugin, `curl`, `jq` and `sha256sum`, about 3 GB of free RAM, and network access to
pull images.

