---
'veysur-api': minor
---

Self-hosted installs can keep uploaded files in an S3-compatible service (AWS S3, MinIO). `config-generate.sh` asks for the endpoint, buckets and access key, generates the nginx storage include, and `backup.sh` and `restore.sh` handle installs whose files are not on the local volume. Local disk stays the default.
