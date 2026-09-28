<!-- cspell:ignore mysqldump gzip caddy gpg rsync crontab daemon.json -->

# Maintenance

**Parent:** [README.md](./README.md)

Keep an installation healthy: upgrade it, back it up, restore it, and move it to another server. Commands run
from the directory that holds `compose.yaml` and `scripts/` (`deploy/` in a source checkout, the unpacked
`veysur/` directory from a release).

## What holds state

| What | Where | In `backup.sh` | If it is lost |
|---|---|---|---|
| Surveys, responses, users, settings | `veysur-mysql-data` volume | Yes | Everything is lost |
| Uploaded files | `veysur-files` volume, or your S3 buckets | Volume only; buckets are your responsibility | Images and attachments are lost; database records remain |
| `.env` | The deploy directory | Yes | See the secrets below |
| Custom TLS certificate | `certs/` | Yes | Supply the certificate again |
| Issued certificates | `veysur-caddy-data` volume | With `--include-caddy-data` | Caddy requests new ones, subject to Let's Encrypt rate limits |
| Cache and rate limits | Redis | No | Nothing of value; it holds no persistent data |

The secrets in `.env` matter most, and the backup archive is the only copy you can rely on:

- `API_ENCRYPTION_PRIVATE_KEY` and `API_ENCRYPTION_PRIVATE_KEY_PASSWORD`: encrypted fields, currently users'
  two-factor secrets, become unreadable. Affected users cannot pass two-factor checks until an operator resets
  them. There is no key rotation.
- `API_JWT_KEY`: every session ends and everyone signs in again. Nothing else is lost.
- `API_S3_LOCAL_SECRET` (local storage): file links already issued stop working. No files are lost.
- `API_S3_SECRET_ACCESS_KEY` (S3 storage): without it the API cannot read or write files. Create a new key in
  your provider, update `.env` and run `./scripts/deploy.sh`.
- `API_PROJECT_OWNER_ID`: without it the project has no owner in the app. Re-run
  `./scripts/admin-account-bootstrap.sh` or copy the value back.
- `MYSQL_ROOT_PASSWORD` and `MYSQL_PASSWORD` apply only when the database volume is first created. Editing
  them in `.env` later does not change the database, and the API can no longer connect.

## Upgrade

Read the release notes for the new version first. Then:

1. Take a backup and copy it off the server (see [Backup](#backup)). The upgrade takes its own database
   snapshot, but that stays on this server and does not cover files.
2. Unpack the new release in a **new directory** beside the current one, then carry the configuration across.

   ```bash
   tar -xzf veysur-1.3.0.tar.gz
   cp /opt/veysur-1.2.0/.env veysur/.env
   cp -r /opt/veysur-1.2.0/certs/. veysur/certs/
   ```

3. Run the new release's `update.sh` from the new directory.

   ```bash
   cd veysur
   ./scripts/update.sh --tag 1.3.0
   ```

   For a release built with images and no internet access, point `--offline` at the bundled `images/`
   directory instead of pulling.

   ```bash
   ./scripts/update.sh --tag 1.3.0 --offline images
   ```

Use a new directory because a release also carries the matching `compose.yaml`, nginx and Caddy configuration
and scripts, and `update.sh` changes only the image tag. The stack is named `veysur` regardless of directory,
so the new directory takes over the same containers and volumes. Do not run `install.sh` for an upgrade, as it
skips the snapshot and the version check.

`update.sh` refuses to skip a major version (upgrade to each in turn, or pass `--force`), pulls or loads the
images, snapshots the databases to `backups/`, runs the migrations, recreates the containers and checks the
API. Afterwards, confirm with `./scripts/veysur.sh status` and remove the old directory when you are happy.

If something goes wrong:

- **The new version does not become healthy.** `update.sh` pins the previous version in `.env` and starts it
  again.
- **A migration fails.** The previous version is pinned again, but the database may be partly changed. Restore
  the backup from step 1 with [`restore.sh`](#restore), or the snapshot named in the error message.
- **Going back to an older version later.** Migrations are not reversed. Restore a backup taken before the
  upgrade, using the older release's files.

Snapshots named `backups/veysur-*-before-*.sql.gz` are never deleted automatically. Remove old ones by hand.

## Backup

```bash
./scripts/backup.sh
```

This writes `backups/veysur-backup-<time>.tar` while the stack keeps running. It holds the databases, the
uploaded files, `.env` and `certs/`. With S3 storage there are no uploaded files in the archive: back the
buckets up with your provider, see [storage.md](./storage.md#backup).

| Option | Effect |
|---|---|
| `--output <dir>` | Write somewhere other than `backups/` |
| `--keep <n>` | Keep only the newest `n` archives in that directory |
| `--include-caddy-data` | Also save issued certificates |

The database and the files are copied a few seconds apart. At worst, a file uploaded in that instant is
missing or has no record.

**The archive contains every secret in `.env`, including the encryption keys.** Keep it off the server and
encrypted.

```bash
gpg --symmetric --cipher-algo AES256 backups/veysur-backup-20260921-020000.tar
rsync -a backups/ backup-host:/srv/veysur-backups/
```

To run nightly, add a crontab entry for a user who can run Docker, and keep two weeks of archives:

```bash
30 2 * * * cd /opt/veysur && ./scripts/backup.sh --keep 14 >> /var/log/veysur-backup.log 2>&1
```

A backup you have never restored is a guess. Restore one to a spare machine now and then, and log in.

## Restore

```bash
./scripts/restore.sh backups/veysur-backup-20260921-020000.tar
```

This replaces the databases, uploaded files (local storage) and `.env` with the archive's contents, then starts
the stack. An S3 install's files stay in its buckets. It
asks first (`--yes` skips the question). The previous `.env` is kept as `.env.pre-restore-<time>`.

- The host needs Docker and an unpacked release. The images must already be present or pullable. From a
  release built with images, load them first with `docker load -i images/veysur-<version>-images.tar`.
- The restored `.env` pins the version that took the backup. If the unpacked release is newer, the script
  says so, and you can move to it afterwards with `update.sh`.
- A MySQL volume keeps the passwords it was created with. If this host already has one from a different
  install, the restore stops before changing anything and prints the command that deletes that volume. Run it
  only if you are sure you no longer need that data.
- `--no-start` restores the data but does not start the stack. Use it when the domain is changing.

After a restore, log in, open a survey, and check that its images load.

## Move to another server

1. **Stop the application on the old server, then back it up**, so nothing is written after the backup. Leave
   MySQL running, because the backup reads from it.

   ```bash
   docker compose stop caddy nginx api task-manager
   ./scripts/backup.sh --include-caddy-data
   ```

2. **Prepare the new server.** Install Docker and unpack the same release version as the old server
   (`VEYSUR_IMAGE_TAG` in its `.env`). Load the images if it has no registry access.
3. **Copy the archive** to the new server and restore without starting.

   ```bash
   ./scripts/restore.sh veysur-backup-20260921-020000.tar --no-start
   ```

4. **Change the domain, if it is changing.** Run `./scripts/config-generate.sh`. Existing values become the
   defaults, so change the domain and accept the rest. It updates the related keys, including
   `API_S3_PUBLIC_BASE_URL`.
5. **Point DNS at the new server**, then start:

   ```bash
   ./scripts/deploy.sh
   ```

   Do this in that order. Failed certificate requests count against Let's Encrypt limits, so start Caddy only
   once the name resolves to the new host. A restore that included the certificate store reuses the existing
   certificate on the same domain.
6. **Check it.** Log in, open a survey with images, and run `./scripts/veysur.sh mail-test you@example.com`.
   Keep the old server, stopped, until you are sure.

If the domain changed, links in e-mails already sent, such as survey invitations, still point at the old
domain.

## Routine operation

| Task | Command |
|---|---|
| Service state | `./scripts/veysur.sh status` |
| Follow logs | `./scripts/veysur.sh logs api` |
| Restart a service | `./scripts/veysur.sh restart api` |
| Health check | `curl -s https://your.domain/api/ping` |
| Test e-mail | `./scripts/veysur.sh mail-test you@example.com` |
| Apply a `.env` change | `./scripts/deploy.sh` |
| List accounts | `docker compose exec -T -e API_TASK=user -e API_ACTION=listAccounts api node dist/run.js` |

To set a new password for an account, for example when someone is locked out, run this. It prints a generated
password once and bypasses the e-mailed reset link, so only an operator can do it.

```bash
docker compose exec -T -e API_TASK=user -e API_ACTION=resetPassword -e API_TASK_JSON='{"email":"user@example.com"}' api node dist/run.js
```

Only Caddy publishes ports (80 and 443 by default). MySQL and Redis are reachable only inside the Docker
network, so the firewall needs to allow just those two.

The containers restart after a reboot as long as the Docker service starts at boot. Docker keeps container
logs without a size limit by default. To cap them, set this in `/etc/docker/daemon.json` and restart Docker:

```json
{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }
```
