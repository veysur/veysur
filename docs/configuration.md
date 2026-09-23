<!-- cspell:ignore caddy -->

# Configuration

**Parent:** [README.md](./README.md)

`deploy/.env` is the single configuration file. Compose reads it for interpolation and maps each key
explicitly into the containers that need it, so a secret only reaches the service that uses it (for example
`MYSQL_ROOT_PASSWORD` never reaches the API). `config-generate.sh` writes it; `.env.example` lists every key.
Required secrets fail at `docker compose config` if empty. Anything not listed here is ignored.

## Stack

| Key | Default | Purpose |
|---|---|---|
| `VEYSUR_IMAGE_TAG` | `latest` | Tag of `veysur/api` and `veysur/nginx`; `update.sh` rewrites it |
| `VEYSUR_IMAGE_REGISTRY` | `ghcr.io/veysur` | Registry + org prefix images are pulled from; point at a private registry for a custom build |
| `VEYSUR_HTTP_PORT` / `VEYSUR_HTTPS_PORT` | `80` / `443` | Host ports Caddy publishes |
| `VEYSUR_TLS_SNIPPET` | `./caddy/tls-auto.caddy` | TLS mode, see [tls.md](./tls.md) |
| `VEYSUR_ACME_EMAIL` | empty | Let's Encrypt contact, required for automatic TLS |
| `VEYSUR_SITE_ADDRESS` | `API_WEB_DOMAIN` | Address Caddy serves |
| `VEYSUR_ADMIN_EMAIL` | empty | Used by the first-account bootstrap |

## Application

| Key | Purpose |
|---|---|
| `API_WEB_DOMAIN`, `API_DOMAIN`, `API_CORS_ALLOWED_DOMAINS` | Public domain, no scheme |
| `API_S3_PUBLIC_BASE_URL` | Public base URL for file links, includes any non-standard port |
| `API_BRAND_NAME` | Product name in non-legal contexts, default `VeySur` |
| `API_PROJECT_OWNER_ID` | Written by `admin-account-bootstrap.sh`; do not edit |
| `MYSQL_DATABASE`, `MYSQL_DATABASE_IP_LOCATION`, `MYSQL_USER` | Database names and user. The IP-location database is created but not used by the self-hosted edition |
| `MYSQL_MEMORY_LIMIT_MB`, `MYSQL_BUFFER_POOL_MB` | MySQL container memory limit / InnoDB buffer pool, in MB. Blank lets `config-generate.sh` size these from detected host RAM (floor 1250/512) |
| `API_MAIL_HOST`, `_PORT`, `_TRANSPORT_TYPE`, `_SECURE`, `_AUTH_USER`, `_AUTH_PASS`, `_CANARY_TO` | Outbound SMTP relay. Left blank, mail fails loudly. See [email.md](./email.md) |
| `API_MAIL_ADDRESS_FROM`, `_FROM_NAME`, `_ADDRESS_CONTACT`, `API_COMPANY_NAME` | Sender identity. Blank uses `no-reply@<API_WEB_DOMAIN>` and `API_BRAND_NAME` |
| `API_MAIL_BOUNCE_DOMAIN`, `API_MAIL_IMAP_*` | Optional bounce and complaint processing over IMAP. Blank disables it |

The project name and timezone are not keys: they are seeded on first start and then edited in the admin app.

Fixed in `compose.yaml`, not keys: `DEPLOYMENT_MODE=self-hosted`, local-disk file storage
(`API_S3_TYPE=local`, `/data/files`, see [storage.md](./storage.md); external S3 is not supported), `MYSQL_HOST=mysql`, `REDIS_HOST=redis`, empty `BUGSINK_DSN`. There is no
`API_COMPOSITION_MODULE`; its absence keeps the API on plain core composition.

## Secrets

`API_JWT_KEY`, `MYSQL_ROOT_PASSWORD`, `MYSQL_PASSWORD`, `REDIS_PASSWORD`, `API_S3_LOCAL_SECRET`, and the
field-encryption trio `API_ENCRYPTION_PUBLIC_KEY`, `API_ENCRYPTION_PRIVATE_KEY`,
`API_ENCRYPTION_PRIVATE_KEY_PASSWORD` (the keys are base64 of a 4096-bit RSA PEM pair). Generated values are
hex or base64 so they are safe unquoted in `.env`. `./scripts/backup.sh` includes `.env`. [maintenance.md](./maintenance.md) lists what losing each secret costs;
losing the encryption keys, for example, makes encrypted fields unreadable.

## Frontend values fixed at image build time

rsbuild inlines every `PUBLIC_*` value into the bundle when the nginx image is built, so setting them in `.env`
has no effect. The defaults in `deploy/docker/Dockerfile.nginx` are the self-hosted configuration; override
with `docker build --build-arg` only for a custom install.

| Build argument | Default | Effect |
|---|---|---|
| `PUBLIC_EDITION` | `self-hosted` | Leave at `self-hosted`; an unset value selects a different, unsupported mode |
| `PUBLIC_PROJECT_SCOPE` | `single` | Admin resolves its one project without a per-project subdomain |
| `PUBLIC_REST_API_BASE_PATH` | `/api` | API path on the single origin |
| `PUBLIC_BASE_ACCOUNT` | `/account` | Account app path, also the "Manage Account" link target |
| `PUBLIC_AUTHENTICATION_DOMAIN` | empty | Empty means a single origin with no sign-in handoff |
| `PUBLIC_ASSET_PREFIX` | empty | Asset URL prefix |
| `PUBLIC_GA_TAG_ID_ACCOUNT` | empty | Analytics tag; empty disables it |
| `PUBLIC_SITE_ACCESS_KEY` | empty | Optional access gate |
| `PUBLIC_SITE_UNAVAILABLE_TITLE` / `_MESSAGE` | empty | Gate copy |
| `BUILD_VERSION` | `dev` | Version shown in the app |
