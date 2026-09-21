# File storage

**Parent:** [README.md](./README.md)

Uploaded files (survey images, response attachments, imports) are stored on local disk, in the
`veysur-files` Docker volume. There is nothing to configure and no bucket to create.

External S3-compatible storage is not supported in this release. The setting exists in the API, but the
Compose stack does not wire it up, so files always live in the volume.

## How it works

The volume is mounted at `/data/files` in the `api` and `task-manager` containers. It holds two directories:

| Directory | Contents | Access |
|---|---|---|
| `veysur-files` | Public files such as survey images | Served to anyone with the link |
| `veysur-private` | Private files such as response attachments | Served only through a signed, expiring link |

nginx passes `/veysur-files/` and `/veysur-private/` requests to the API, which reads the volume. Uploads go
to the API too, using a short-lived signed URL. Everything is on the one origin, so no CORS configuration is
needed.

`API_S3_LOCAL_SECRET` signs those links. Changing it invalidates links already issued, such as a download
link someone has open, but loses no files. `API_S3_PUBLIC_BASE_URL` must match the address users reach the
site on, including a non-standard port, because it forms part of the links.

## Limits

- A single file may not exceed 50 MB. The API rejects larger uploads.
- nginx accepts request bodies up to 100 MB.

## Disk space

The volume grows with uploads and lives in Docker's data directory (`/var/lib/docker` by default). Keep an eye
on free space there, and include it in your monitoring.

```bash
docker system df -v | grep veysur-files
```

To move Docker's data directory to a larger disk, see the Docker documentation for `data-root`.

## Backup

The volume is included in `./scripts/backup.sh`. Back it up together with the database, because database
records point at the files. See [maintenance.md](./maintenance.md).
