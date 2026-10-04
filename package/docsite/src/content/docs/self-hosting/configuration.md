---
title: Self-hosting Configuration
description: Where the settings of a self-hosted installation live and where to find detail.
---

## Environment file

All settings live in `.env` in the installation directory. Generate or change them with:

```bash
./scripts/config-generate.sh
```

The script keeps existing values as defaults, so it can be re-run safely. Apply a change to the running stack with `./scripts/deploy.sh`.

## Main areas

| Area | What it controls |
|---|---|
| TLS | Automatic certificates, a supplied certificate, or a local certificate for trials |
| Storage | Uploaded files in a local volume or in S3 buckets |
| Email | The SMTP relay used for resets and invitations |

## Telemetry

VeySur sends no usage data to VeySur Limited. Error reporting (`BUGSINK_DSN`) and Google Analytics are off unless the operator sets a destination. Any reports then go only to that destination.

## Detailed reference

The repository documentation covers each area in depth:

- [Configuration](https://github.com/veysur/veysur/blob/master/docs/configuration.md)
- [TLS](https://github.com/veysur/veysur/blob/master/docs/tls.md)
- [Storage](https://github.com/veysur/veysur/blob/master/docs/storage.md)
- [Email](https://github.com/veysur/veysur/blob/master/docs/email.md)
