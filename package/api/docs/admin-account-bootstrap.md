# Admin account bootstrap

Creating the first usable account for a fresh install, in both the local dev stack and a production
self-hosted deployment. Public signup leaves email unverified, which blocks project-ownership claims
in the JWT, so there is no way to log in and start using a fresh install without this.

Self-hosted's single project is a static, config-sourced value, not a database row (see
`model/service/ServiceProject.ts`). Creating an account does not make it the project owner. That
needs `API_PROJECT_OWNER_ID=<userId>` in `deploy/.env`, along with `API_PROJECT_NAME` and
`API_PROJECT_TIMEZONE` if non-default values are wanted. Until it is set, the bootstrapped user can log
in and use `authedAdmin`-gated features (for example editing surveys), but any `projectOwner`-gated
action (team invites, `/setting/project`) stays hidden or returns 403.

## Create the first account

Run from `deploy/`:

```bash
./scripts/admin-account-bootstrap.sh --email admin@example.com
```

The script creates the account, writes `API_PROJECT_OWNER_ID` into `deploy/.env`, and recreates the
`api` and `task-manager` containers so they pick it up. In the dev stack it runs the API from source
and only recreates `api`. Omit `--password` to have one generated and printed once; a password passed
on the command line lands in shell history. It fails loudly if the email already exists. Run `--help`
for all options, or `--dry-run` to see what it would do.

The account is created pre-verified, unlike public signup. See
[deployment.md](../../../docs/deployment.md) for where this fits in an install.

## How it works

`ServiceUser` exposes `createAccount`, `listAccounts` and `resetPassword` through the generic
task-runner dispatch (`API_TASK`, `API_ACTION`, `API_TASK_JSON`, see [task-manager.md](task-manager.md)).
They are never exposed over HTTP. The script calls `createAccount` with:

```bash
docker compose exec -T \
  -e API_TASK=user -e API_ACTION=createAccount \
  -e API_TASK_JSON='{"email":"admin@example.com"}' \
  api node dist/run.js
```

Only `email` is required. `password` is generated when omitted, and `nameFirst` and `nameLast` default
to `Admin` and `User`. The task returns `{ userId, email, password? }`; `password` is present only when
one was generated.

## Changing settings later

Every post-install setting (project owner, project name, mail connection, limits) lives in
`deploy/.env`. Edit it, then apply it from `deploy/`:

```bash
./scripts/deploy.sh
```

See [configuration.md](../../../docs/configuration.md) for every key.

## List accounts

Run from `deploy/`:

```bash
docker compose exec -T -e API_TASK=user -e API_ACTION=listAccounts api node dist/run.js
```

Returns every user with the project they own (at most one: the configured project, if
`API_PROJECT_OWNER_ID` names them as its owner).

## Reset a password

Run from `deploy/`:

```bash
docker compose exec -T \
  -e API_TASK=user -e API_ACTION=resetPassword \
  -e API_TASK_JSON='{"email":"admin@example.com"}' \
  api node dist/run.js
```

Same generate-when-omitted behaviour as `createAccount`. This bypasses the emailed-token reset flow
entirely: an operator with infrastructure-level access to run it has no code to prove.
