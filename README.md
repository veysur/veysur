# VeySur

VeySur is a survey platform for building, publishing and analysing surveys, with control over who
takes part and where the data lives. Use it hosted at [veysur.com](https://veysur.com), or run it on
your own server.

[Admin guide](https://docs.veysur.com) · [Self-host](#get-started) · [Contributing](./CONTRIBUTING.md)

## What it is for

VeySur suits surveys where you know, or want to control, who answers:

- **Research and academic studies**, including repeat and longitudinal collection where the same
  participants answer more than once.
- **Public sector, health and consultation work** that needs an audit trail and care over personal data.
- **Charities and community groups** gathering feedback from members, volunteers and service users.
- **Market research and polling** across several languages.
- **Staff and customer surveys** run inside an organisation, on its own infrastructure if required.

## Features

### Build

- A survey editor with groups, questions and content elements (formatted text and embedded YouTube
  video), with live preview of what participants see.
- Text, number, checkbox, dropdown, button, yes/no, star and point-scale, image select, ranking, and
  date and time questions, plus matrix grids and multi-part questions for structured answers.
- Conditional questions and groups that appear only when earlier answers call for them.
- Text expressions that insert a participant detail or an earlier answer into question wording.
- Multi-language surveys, with per-language text and images, and optional randomised answer order.

### Publish and invite

- Publications freeze a survey at the moment it is published, so responses always match the
  questions that were asked.
- Invite participants by email, send reminders, and track delivery, bounces and complaints.
- Open access, unique participant links, or public registration, chosen per survey.
- Custom participant attributes for personalised surveys.
- Anonymous surveys that record no participant identity, IP address or real timestamps.
- Merge responses from an earlier publication into a newer one.

### Collect and analyse

- A response list with search and filters, and the option to add or edit responses by hand.
- Per-question charts (bar, pie, stacked bar and average rank) and CSV export of responses and
  participants.
- Export and import surveys, single publications, or a complete archive with all responses.

### Keep control of your data

- Add team members to a project to manage surveys together.
- Self-host with Docker Compose, with uploaded files kept locally or in S3-compatible storage.
- Sensitive fields are encrypted with keys that you hold.

## Get started

**Hosted:** create an account at [veysur.com](https://veysur.com).

**Self-hosted:** you need a Linux server with Docker (Compose 2.22 or later), 4 GB of RAM, 10 GB of
free disk, a domain name pointing at it with ports 80 and 443 open, and an SMTP relay for password
resets and invitations. Install from a release package (`veysur-<version>-with-images.tar.gz` bundles
the container images):

```bash
tar -xzf veysur-<version>-with-images.tar.gz && cd veysur
./install.sh                                                  # asks a few questions and starts VeySur
./scripts/admin-account-bootstrap.sh --email you@example.com  # creates the first administrator
./scripts/veysur.sh mail-test you@example.com                 # checks that e-mail is sent
```

Then open your domain in a browser and sign in with the password the script printed.

| To do this | Read |
|---|---|
| Install step by step | [docs/deployment.md](./docs/deployment.md) |
| Set up SMTP and the sender address | [docs/email.md](./docs/email.md) |
| Understand file storage | [docs/storage.md](./docs/storage.md) |
| Choose an HTTPS mode | [docs/tls.md](./docs/tls.md) |
| Look up every setting | [docs/configuration.md](./docs/configuration.md) |
| Upgrade, back up, restore or move to a new server | [docs/maintenance.md](./docs/maintenance.md) |

Run `./scripts/backup.sh` before you rely on an install: it saves the encryption keys, which cannot be
recovered any other way. Only the latest release receives fixes (see [SECURITY.md](./SECURITY.md)).

## Documentation

- [Admin guide](https://docs.veysur.com): building, publishing and managing surveys.
- [docs/](./docs/README.md): architecture, operations and development notes.

## Development

```bash
pnpm install
./deploy/scripts/config-generate.sh --dev   # once: writes deploy/.env for local development
pnpm dev:migrate                            # create or update the local database
pnpm dev                                    # API, app dev server and proxy with live reload
pnpm dev:admin-account --email you@example.com      # in another terminal: create the first account
```

Open <http://localhost:8080>. Only Docker (Compose 2.22 or later) is needed. See
[docs/development.md](./docs/development.md) for the dev loop and tests, and [deploy/](./deploy) for the
Compose stack.

Contributions are welcome; read [CONTRIBUTING.md](./CONTRIBUTING.md) first, as all contributions require
signing the [CLA](./CLA.md). Report security issues as described in [SECURITY.md](./SECURITY.md), not in
a public issue.

## Licence

Source-available under the [Elastic License 2.0](./LICENSE). Free to use, self-host and modify,
including running it as part of a service you provide to your own clients (survey design,
fieldwork, hosting and administration, and so on). What's not permitted is giving third parties
direct access to VeySur itself, for example reselling hosted VeySur logins or API access as your
product. See [FAQ.md](./FAQ.md) and [TRADEMARKS.md](./TRADEMARKS.md).
