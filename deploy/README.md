# deploy

Docker Compose runtime for self-hosting VeySur. Being built up phase by phase; today it holds
the core stack (nginx, API, MySQL, Redis), the production Dockerfiles and the static error pages.

## Release package and installer

`./scripts/release-package.sh <version>` writes `dist/veysur-<version>.tar.gz` (about 16 KB): the
Compose file, nginx, Caddy and MySQL config, operator scripts, `install.sh` and this README, with
`VEYSUR_IMAGE_TAG` pinned to the version. `--images` adds `docker save` archives of every image for
air-gapped installs (about 450 MB); `--build-images` builds `veysur/api` and `veysur/nginx` at that
version first. On a target host:

```bash
tar -xzf veysur-1.2.0.tar.gz && cd veysur
./install.sh
```

`install.sh` offers to install Docker (via Docker's official script) if it is missing, loads any
bundled images, runs `config-generate.sh` and then `deploy.sh`. `--yes --domain <domain>` makes it
non-interactive. Set `VEYSUR_HTTP_PORT`/`VEYSUR_HTTPS_PORT` when 80/443 are taken. For a local trial
without a public domain, choose the local test certificate in `config-generate.sh`: with an ACME
contact e-mail, Caddy insists on a publicly issuable name and `localhost` never qualifies.

## Install

```bash
./scripts/config-generate.sh
./scripts/deploy.sh
./scripts/admin-account-bootstrap.sh --email you@example.com
```

`config-generate.sh` asks for the domain, TLS mode, administrator e-mail and SMTP relay, generates
every secret and key, and writes `deploy/.env` after showing a diff (secrets hidden). Re-run it to
change settings. `deploy.sh` is idempotent: it starts MySQL and Redis, runs migrations, starts the
rest and checks `/api/ping`. `deploy.sh --dry-run` prints the resolved configuration with secrets
hidden. Pre-flight requires 4 GB RAM and 10 GB free disk (`VEYSUR_SKIP_PREFLIGHT=1` to override).

## Development

`compose.dev.yaml` layers over the production file for contributors:

```bash
./scripts/config-generate.sh --dev
cd .. && pnpm dev:migrate && pnpm dev
```

It builds one dev image (`Dockerfile.dev`, dependencies baked in), bind-mounts `package/*/src`, runs
the API with `tsx watch` and the app with the rsbuild dev server behind `nginx.dev.conf`, and leaves
Caddy and the task manager off. The app is at <http://localhost:8080> (not port 80). Create the first
account with `pnpm dev:admin --email you@example.com`; the script detects the dev stack. Migrations run from compiled output (the patch scanner would
otherwise load test files).

## Update

```bash
./scripts/update.sh --tag 1.2.0
```

Forward-only. It pulls the images (or loads `*.tar` archives with `--offline <dir>`), snapshots
every database to `deploy/backups/` (aborting if that fails), runs migrations, recreates the
containers and checks health. If the new release is unhealthy it re-pins the previous tag and
restarts it; a failed migration leaves the snapshot as the recovery path. Skipping a major version
needs `--force`.

## Operate

```bash
./scripts/veysur.sh status
./scripts/veysur.sh logs api
```

Manual control is plain Compose:

```bash
docker compose up -d --wait
curl http://localhost/api/ping
```

Migrations are a one-shot container, not part of `up`:

```bash
docker compose run --rm migrate --dry-run
docker compose run --rm migrate
```

The `task-manager` service runs the scheduled-task runner once a minute. Its healthcheck fails if
no run has finished for 12 minutes; a single run is killed after 10 minutes so it cannot stall
the loop.

Caddy is the front door: it publishes ports 80 and 443, terminates TLS and proxies to nginx, which
is not published. Choose the TLS mode with `VEYSUR_TLS_SNIPPET` in `.env`: automatic Let's Encrypt
(default, needs a public domain and `VEYSUR_ACME_EMAIL`), your own certificate in `deploy/certs/`,
Caddy's local CA for trials, or none when a load balancer already terminates TLS. Certificates live
in the `veysur-caddy-data` volume and survive restarts. Renewal problems show in
`docker compose logs caddy`.

`.env` is the single configuration file. `API_COMPOSITION_MODULE` is intentionally not a key:
leaving it unset keeps the API on plain core composition.

## Images

Build from the repository root:

```bash
docker build -f deploy/docker/Dockerfile.api -t veysur/api .
docker build -f deploy/docker/Dockerfile.nginx -t veysur/nginx .
```

## Build-time values (nginx image)

`rsbuild` inlines every `PUBLIC_*` value into the frontend bundle when the image is built, so
these are fixed per image. Setting them in a runtime `.env` has no effect. The defaults below
are the self-hosted configuration; override with `--build-arg` only for a custom install.

| Build arg | Default | Effect |
|---|---|---|
| `PUBLIC_EDITION` | `self-hosted` | Unset resolves to the commercial edition, so this default must stay |
| `PUBLIC_PROJECT_SCOPE` | `single` | Admin app resolves its one project without a per-project subdomain |
| `PUBLIC_REST_API_BASE_PATH` | `/api` | API path on the single origin |
| `PUBLIC_BASE_ACCOUNT` | `/account` | Account app mount path, also the "Manage Account" link target |
| `PUBLIC_AUTHENTICATION_DOMAIN` | empty | Separate auth domain; empty on a single origin |
| `PUBLIC_ASSET_PREFIX` | empty | Asset URL prefix |
| `PUBLIC_GA_TAG_ID_ACCOUNT` | empty | Analytics tag; empty disables it |
| `PUBLIC_SITE_ACCESS_KEY` | empty | Optional access gate |
| `PUBLIC_SITE_UNAVAILABLE_TITLE` / `_MESSAGE` | empty | Gate copy |
| `BUILD_VERSION` | `dev` | Version string shown in the app |
