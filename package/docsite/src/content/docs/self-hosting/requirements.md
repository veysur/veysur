---
title: Self-hosting Requirements
description: The server, network and mail requirements for a self-hosted VeySur installation.
---

## Server

| Requirement | Minimum |
|---|---|
| Memory | 3 GB RAM |
| Disk | 10 GB free |
| Software | Docker with Compose 2.22 or later |

The installer refuses to continue below the memory or disk minimum. On Windows, install under WSL (Windows Subsystem for Linux).

## Network

- A domain name whose DNS record points at the server. Automatic HTTPS cannot be issued until the name resolves.
- Ports 80 and 443 open to the internet, in the host firewall and any cloud firewall.

Only the front-door service publishes ports. MySQL and Redis stay inside the Docker network.

## Email

An SMTP relay and its credentials are needed for password resets and survey invitations. Installation works without one, and it can be added later.

## Backups

Keep backups on a different machine from the server. See [Backup and Restore](/self-hosting/backup-and-restore/).
