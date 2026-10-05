---
title: Self-hosting Overview
description: What the self-hosted edition of VeySur includes and where its limits are.
---

## What self-hosting means

The self-hosted edition runs VeySur on a single server that an organisation controls. It is source-available under the Elastic License 2.0. Internal use, including use by affiliated companies, is permitted. Offering VeySur to third parties as a hosted or managed service is not.

## Components

VeySur runs as a Docker Compose stack of these services:

- Caddy, which terminates HTTPS
- nginx, which serves the apps
- the API
- a task manager, which runs scheduled work
- MySQL 8.4
- Redis 7.2

## Scope

A self-hosted installation holds a single project. It has no billing or subscriptions. The survey editor, participant management, publications and responses work as described in the rest of this guide.

## Encryption

Encryption at rest of the database and uploaded files is a feature of the hosted service only. The self-hosted edition encrypts only specific sensitive fields, currently two-factor secrets, with keys that the operator holds. To protect the rest of the data at rest, use full-disk or volume encryption on the server.

Only the latest release receives security fixes. Upgrade each release in turn.

## Next steps

Check the [requirements](/self-hosting/requirements/), then follow the [installation steps](/self-hosting/install/).
