---
title: Install VeySur
description: Install a self-hosted VeySur instance from a release package.
---

## Install

1. Download the latest release from the [VeySur releases page](https://github.com/veysur/veysur/releases).
2. Unpack it and run the installer:

   ```bash
   tar -xzf veysur-1.2.0.tar.gz && cd veysur
   ./install.sh
   ```

The installer offers to install Docker if it is missing. It then asks for the domain, TLS mode, administrator email and SMTP relay, generates every secret, and starts the stack. Add `--yes --domain <domain>` to run it without prompts.

The thin release downloads its images when installing. The `-with-images` release bundles them for servers without registry access.

## Create the first account

```bash
./scripts/admin-account-bootstrap.sh --email you@example.com
```

The script prints a generated password once. Store it securely.

## Check email

Once a mail relay is configured, send a test message:

```bash
./scripts/veysur.sh mail-test you@example.com
```

## Day-to-day commands

`./scripts/veysur.sh` also provides `status`, `logs`, `restart` and `stop`.
