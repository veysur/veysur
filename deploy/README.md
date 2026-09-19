# deploy

Docker Compose runtime for self-hosting VeySur. Being built up phase by phase; today it holds
the core stack (nginx, API, MySQL, Redis), the production Dockerfiles and the static error pages.

## Run the stack

```bash
cd deploy
cp .env.example .env
# Fill in the domain and every empty secret in .env, then:
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
