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

A self-hosted installation holds a single project. It has no billing, subscriptions or multi-tenancy. The survey editor, participant management, publications and responses work as described in the rest of this guide.

Only the latest release receives security fixes. Upgrade each release in turn.

## Next steps

Check the [requirements](/self-hosting/requirements/), then follow the [installation steps](/self-hosting/install/).
