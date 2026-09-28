<!-- cspell:ignore AKIA -->
# File storage

**Parent:** [README.md](./README.md)

Uploaded files (survey images, response attachments, imports and exports) are stored in one of two places:

| Mode | Where files live | Set up |
|---|---|---|
| Local disk (default) | The `veysur-files` Docker volume | Nothing to configure |
| S3-compatible | Your own buckets on AWS S3, MinIO or a similar service | [Use an S3 service](#use-an-s3-service) |

Both modes keep every file link on the same origin as the site, so no CORS configuration is needed.

## How it works

The application uses two fixed paths in its links: `/veysur-files/` for public files such as survey images,
and `/veysur-private/` for private files such as response attachments. nginx handles both, and uploads use a
short-lived signed URL.

| | Local disk | S3 |
|---|---|---|
| Public files | nginx passes the request to the API, which reads the volume | nginx forwards the request to the public bucket |
| Private files | The API checks a signed, expiring link | nginx forwards a signed, expiring S3 link |
| Uploads | Signed URL on the API | Signed S3 URL, sent through nginx to the bucket |
| Signing secret | `API_S3_LOCAL_SECRET` | The S3 access key |

In S3 mode the API creates signed links against the S3 endpoint and replaces the endpoint with
`API_S3_PUBLIC_BASE_URL`. nginx then forwards the request to the real endpoint with the original `Host`
header, which the signature requires. The API and your S3 service never need to be reachable from the
browser directly.

`API_S3_PUBLIC_BASE_URL` must match the address users reach the site on, including a non-standard port,
because it forms part of the links.

## Use an S3 service

### 1. Create two buckets

Create one bucket for public files and one for private files. Bucket names must differ. AWS bucket names are
unique across all accounts, so pick names of your own, for example `acme-veysur-files` and
`acme-veysur-private`. A name may not match a site path (`api`, `admin`, `account`, `survey`, `docs`,
`errors`, `health`, `static` or `image`).

### 2. Allow anonymous read on the public bucket only

Survey images are shown to participants without signing in, and nginx cannot sign requests. The public bucket
therefore needs a policy that allows anyone to read objects. Keep the private bucket fully private.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::acme-veysur-files/*"
    }
  ]
}
```

On AWS, turn off "Block public access" for the public bucket only, so that this policy takes effect. Anyone
who knows a file's link can read it, exactly as with the local volume. Listing the bucket stays denied.

### 3. Create an access key

Create a user or key with this policy for both buckets, and note its access key ID and secret.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": [
        "arn:aws:s3:::acme-veysur-files/*",
        "arn:aws:s3:::acme-veysur-private/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": [
        "arn:aws:s3:::acme-veysur-files",
        "arn:aws:s3:::acme-veysur-private"
      ]
    }
  ]
}
```

### 4. Configure VeySur

```bash
./scripts/config-generate.sh
```

Choose **2) S3-compatible service** at the file storage question, then enter the endpoint, region, bucket
names and access key. The script writes the keys below to `.env` and generates `nginx/storage-s3.conf`, which
`deploy.sh` and every other script regenerate whenever `.env` changes. Never edit that file by hand.

| Key | Purpose |
|---|---|
| `API_S3_TYPE` | `local` (default) or `s3` |
| `API_S3_ENDPOINT` | Bare origin of the S3 service: scheme, host and optional port. No path, no trailing slash |
| `API_S3_REGION` | Region used to sign requests |
| `API_S3_PUBLIC_BUCKET`, `API_S3_PRIVATE_BUCKET` | The two bucket names |
| `API_S3_ACCESS_KEY_ID`, `API_S3_SECRET_ACCESS_KEY` | The access key |
| `API_S3_FORCE_PATH_STYLE` | `true`. Buckets are addressed by path, not by subdomain |
| `VEYSUR_STORAGE_SNIPPET` | `./nginx/storage-s3.conf` in S3 mode, `./nginx/storage-local.conf` otherwise |

Then apply it:

```bash
./scripts/deploy.sh
```

Example `.env` values for AWS S3 in London:

```bash
API_S3_TYPE=s3
API_S3_ENDPOINT=https://s3.eu-west-2.amazonaws.com
API_S3_REGION=eu-west-2
API_S3_FORCE_PATH_STYLE=true
API_S3_PUBLIC_BUCKET=acme-veysur-files
API_S3_PRIVATE_BUCKET=acme-veysur-private
API_S3_ACCESS_KEY_ID=AKIA...
API_S3_SECRET_ACCESS_KEY=...
VEYSUR_STORAGE_SNIPPET=./nginx/storage-s3.conf
```

Use the regional endpoint that matches the bucket's region. For MinIO on the same Docker network, use
`API_S3_ENDPOINT=http://minio:9000`, `API_S3_REGION=us-east-1` and the MinIO root or service account key.
The service must allow anonymous reads through its S3 endpoint for the public bucket. Services that only
expose public files on a separate public domain, such as Cloudflare R2, do not fit this design.

### Move existing files to S3

Changing the mode does not copy files. Before switching an install that already holds uploads, copy the
volume into the buckets, keeping the same paths. The volume has one directory per bucket.

```bash
docker run --rm -v veysur_veysur-files:/data:ro -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY \
  amazon/aws-cli s3 sync /data/veysur-files s3://acme-veysur-files --region eu-west-2
docker run --rm -v veysur_veysur-files:/data:ro -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY \
  amazon/aws-cli s3 sync /data/veysur-private s3://acme-veysur-private --region eu-west-2
```

Stop uploads while you copy, run `config-generate.sh` and `deploy.sh`, then check a survey image and an
attachment. Keep the volume until you are sure. Switching back to `local` returns to the volume as it was.

## Limits

- A single file may not exceed 50 MB. The API rejects larger uploads.
- nginx accepts request bodies up to 100 MB.

## Disk space

Local mode only. The volume grows with uploads and lives in Docker's data directory (`/var/lib/docker` by
default). Keep an eye on free space there, and include it in your monitoring.

```bash
docker system df -v | grep veysur-files
```

To move Docker's data directory to a larger disk, see the Docker documentation for `data-root`. In S3 mode
the volume stays empty and storage is your provider's concern.

## Backup

Local mode: the volume is included in `./scripts/backup.sh`. Back it up together with the database, because
database records point at the files. See [maintenance.md](./maintenance.md).

S3 mode: `backup.sh` saves the database and `.env` but **not the files**. Protect the buckets with your
provider's tools, such as versioning and cross-region replication, and keep those copies in step with your
database backups. A restore brings back the database and `.env` only.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Uploads fail with 403 `SignatureDoesNotMatch` | `API_S3_ENDPOINT` differs from the host the API signed, the region is wrong, or `API_S3_PUBLIC_BASE_URL` does not match the site address |
| Survey images return 403 or 404 | The public bucket does not allow anonymous read, or the file was never copied there |
| Attachments return 403 | The signed link expired, or the access key lacks `s3:GetObject` on the private bucket |
| nginx returns 502 | The endpoint is unreachable from the `nginx` container. Check DNS and firewall rules |
| `deploy.sh` stops on the endpoint or a bucket name | See the message: the endpoint must be a bare origin, and bucket names must be valid and distinct |

To see what nginx received, run `./scripts/veysur.sh logs nginx`.
