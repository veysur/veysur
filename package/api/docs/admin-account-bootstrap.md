# Admin account bootstrap

Creating the first usable account for a fresh install, in both local dev
(Tilt) and production self-hosted deployments. Public signup leaves email
unverified (which blocks project-ownership claims in the JWT), so there's no
way to log in and start using a fresh install without this.

Self-hosted's single project is a static, config-sourced value, not a
database row (see `model/service/ServiceProject.ts`) — creating an account
does not automatically make it the project owner. Making that user the
project owner means setting `API_PROJECT_OWNER_ID=<userId>` (the id this tool
prints), along with `API_PROJECT_NAME`/`API_PROJECT_TIMEZONE` if non-default
values are wanted. **Don't skip this** — until it's done, the bootstrapped
user can log in and use `authedAdmin`-gated features (e.g. edit surveys), but
any `projectOwner`-gated action (e.g. team invites, `/setting/project`) stays
hidden/403s.

## Create the first account (Tilt dev)

```bash
./deploy/scripts/admin-account-bootstrap.sh --email admin@veysur.local
```

This creates the account **and** wires it up as the project owner in one
step — see [Changing settings later](#changing-settings-later-devvalues-localyaml)
below for how. Omit `--password` to have one generated and printed once
(prefer this over typing your own, since a password passed on the command
line lands in local shell history either way). Fails loudly, not silently, if
the email already exists. Run `--help` for all options.

## Create the first account (production)

There's no dedicated production bootstrap script yet — a real production
install flow (`values-prod.yaml`, packaging docs) doesn't exist in this repo
yet either (see `deploy/scripts/lib/deploy-common.sh`). Until it does, create
the account directly:

```bash
./deploy/scripts/task/run.sh --job --task user --action createAccount \
  --options '{"email":"admin@example.com"}'
```

This is a console/CLI tool, not an in-app first-run wizard: `ServiceUser`
exposes `createAccount`/`listAccounts`/`resetPassword`, invoked via the
generic task-runner dispatch (`API_TASK`/`API_ACTION`/`API_TASK_JSON`, see
[task-manager.md](task-manager.md)). No new plumbing, no HTTP endpoint —
these methods are never exposed over the network.

Omitting `password` generates one that satisfies the password policy and
prints it once in the task's output. All fields except `email` are optional:

```jsonc
{
  "email": "admin@example.com", // required
  "password": "...", // omit to generate one
  "nameFirst": "Admin", // default: "Admin"
  "nameLast": "User", // default: "User"
}
```

Returns `{ userId, email, password? }` — `password` is only present when one
was generated. The account is created pre-verified (unlike public signup).

**Next step, required**: set `API_PROJECT_OWNER_ID=<userId>` and apply it via
`helm upgrade veysur ./deploy -f deploy/values.yaml -f deploy/values-local.yaml`
(after adding it to `deploy/values-local.yaml` — see below).

## Changing settings later (`deploy/values-local.yaml`)

`deploy/values-local.yaml` is a gitignored, Helm-values-shaped overlay for
any post-install setting — the project owner id today, and project name,
mail/SMTP connection details, resource limits, etc. as they're added later.
Helm value files deep-merge, so this file only ever needs the keys it's
overriding, e.g.:

```yaml
api:
  env:
    API_PROJECT_OWNER_ID: '<userId>'
```

Edit it by hand at any time, or let `admin-account-bootstrap.sh` merge the
one key it knows about into it for you. Making an edit "live" differs by
environment:

- **Tilt**: automatic — `Tiltfile` watches this file and re-renders/re-applies
  as soon as it changes (survives `tilt down`/`tilt up` too, since it's a
  real input file, not a live cluster patch).
- **Production**: run
  `helm upgrade veysur ./deploy -f deploy/values.yaml -f deploy/values-local.yaml`
  after editing, same as for any other config change.

## List accounts

```bash
./deploy/scripts/task/run.sh --exec --task user --action listAccounts
```

Returns every user with the project(s) they own (at most one — the single
configured project, if `API_PROJECT_OWNER_ID` names them as its owner).

## Reset a password

```bash
./deploy/scripts/task/run.sh --exec --task user --action resetPassword \
  --options '{"email":"admin@example.com"}'
```

Same omit-to-generate behaviour as `createAccount`. Bypasses the normal
emailed-token reset flow entirely — an operator with infrastructure-level
access to run this has no code to prove.
