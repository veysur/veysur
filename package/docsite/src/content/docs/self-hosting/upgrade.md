---
title: Upgrade VeySur
description: Move a self-hosted installation to a newer release.
---

## Before upgrading

Read the release notes, then take a [backup](/self-hosting/backup-and-restore/) and copy it off the server. Do not run `install.sh` for an upgrade.

## Steps

1. Unpack the new release in a new directory beside the current one.
2. Copy the configuration across:

   ```bash
   cp /opt/veysur-1.2.0/.env veysur/.env
   cp -r /opt/veysur-1.2.0/certs/. veysur/certs/
   ```

3. Run the update from the new directory:

   ```bash
   cd veysur
   ./scripts/update.sh --tag 1.3.0
   ```

For a release with bundled images and no internet access, add `--offline images`.

## If something fails

If the new version does not become healthy, the previous version is started again. Migrations are never reversed, so a failed migration can leave the database partly changed. Restore the backup in that case.

The update refuses to skip a major version. Upgrade through each one in turn.
