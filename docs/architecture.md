<!-- cspell:ignore caddy nginx mysqldump -->

# Architecture

**Parent:** [README.md](./README.md)

VeySur runs as a small Docker Compose stack on one host. All apps share one origin and one database.

## Services

| Service | Image | Role |
|---|---|---|
| `caddy` | `caddy:2-alpine` | Front door: publishes ports 80 and 443, terminates TLS, proxies to nginx |
| `nginx` | `veysur/nginx` | Serves the static apps and reverse-proxies `/api/` and file paths; not published to the host |
| `api` | `veysur/api` | The REST API (`node dist/run.js`) |
| `task-manager` | `veysur/api` | Runs scheduled work once a minute with the same entrypoint |
| `mysql` | `mysql:8.4` | The single database |
| `redis` | `redis:7.2-alpine` | Cache and rate-limit state, no persistence |
| `migrate` | `veysur/api` | One-shot migration runner (profile `tools`, not started by `up`) |

Named volumes hold state: `veysur-files` (uploaded files), `veysur-mysql-data`, `veysur-mysql-logs`,
`veysur-caddy-data` (certificates) and `veysur-caddy-config`.

## One origin

Every app is served from the same host, split by path:

| Path | App |
|---|---|
| `/admin` | Survey editor and project administration (`/` redirects here) |
| `/account` | Sign-in, profile, two-factor and password management |
| `/survey` | The survey-taking app |
| `/docs` | Documentation site (see [known gaps](#known-gaps)) |
| `/api` | The REST API |

Because there is one origin there is no cross-domain sign-in step: the session survives plain navigation.
nginx trusts `X-Forwarded-For` and `X-Forwarded-Proto` from private ranges, so the API sees the real client
address and scheme through Caddy.

## Data

One MySQL database holds account and project data. The instance has exactly one project, created on first
start and owned by the administrator created with `admin-account-bootstrap.sh`
(`API_PROJECT_OWNER_ID`). Its name and timezone are editable in the admin app.

## Scheduling

The `task-manager` service loops `node dist/run.js` with `API_TASK=taskManager`. Each pass monitors running
tasks, cleans old logs and runs due tasks, so cadence lives in the database, not in the loop. A run is killed
after 10 minutes so a hung run cannot stall the loop, and the healthcheck fails if no run has finished for 12
minutes.

## Editions and extension

A single `edition` value (`self-hosted`) is fixed in `compose.yaml` for the API and baked into the frontend at
build time. Nothing paid is gated by it. The frontend and API expose composition points so a separate
commercial overlay can be added at build time; a self-hosted build leaves them at their committed defaults, and
`API_COMPOSITION_MODULE` is deliberately never set.

## Images

Two first-party images, built from `deploy/docker/`: `veysur/api` and `veysur/nginx`. The nginx image contains
the built admin, survey and account apps and the documentation site. Frontend `PUBLIC_*` values are fixed per
image (see [configuration.md](./configuration.md)).

## Known gaps

- The documentation site is built for a site root, so `/docs/` on the single origin serves a page whose assets
  and links resolve elsewhere.
- Caddy has no healthcheck, so `deploy.sh` cannot see a certificate failure; check `docker compose logs caddy`.
