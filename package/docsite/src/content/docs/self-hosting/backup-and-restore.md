---
title: Backup and Restore
description: Back up, restore and move a self-hosted VeySur installation.
---

## Back up

```bash
./scripts/backup.sh
```

The archive is written to `backups/` while the stack keeps running. It holds the databases, uploaded files, `.env` and `certs/`. Options include `--output <dir>`, `--keep <n>` and `--include-caddy-data`.

The archive contains every secret in `.env`, including the encryption keys. Without `API_ENCRYPTION_PRIVATE_KEY`, two-factor secrets cannot be read. Keep the archive encrypted and off the server.

With S3 storage, the archive holds no uploaded files. Back up the buckets with the storage provider.

## Restore

```bash
./scripts/restore.sh backups/veysur-backup-20260921-020000.tar
```

The script asks for confirmation, replaces the databases and `.env`, and starts the stack. The previous `.env` is kept with a `.pre-restore` suffix. Add `--no-start` to restore without starting.

## Move to another server

Stop the application on the old server and run a backup. Install the same release on the new server and restore with `--no-start`. Point DNS at the new server, then run `./scripts/deploy.sh`.

A restore that has never been tested is unproven. Test one occasionally.
