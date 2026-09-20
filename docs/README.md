# VeySur documentation

Developer and operator documentation for the self-hostable edition. Start with the document that
matches what you are doing.

| Document | Read it to |
|---|---|
| [architecture.md](./architecture.md) | Understand the services, routing, data and scheduling model |
| [deployment.md](./deployment.md) | Install, update, roll back and operate a self-hosted instance |
| [configuration.md](./configuration.md) | Look up every `.env` key and the values fixed at image build time |
| [tls.md](./tls.md) | Choose and troubleshoot HTTPS |
| [development.md](./development.md) | Run the live-reload dev loop, run tests, contribute |
| [timestamps.md](./timestamps.md) | See how timestamps are stored, transmitted, filtered and displayed |
| [survey-publishing.md](./survey-publishing.md) | Understand how a survey is published and snapshotted |
| [snapshot-hash-deduplication.md](./snapshot-hash-deduplication.md) | Understand how identical snapshots are reused |
| [publication-response-merge.md](./publication-response-merge.md) | Understand how responses merge across publications |
| [survey-language-loading.md](./survey-language-loading.md) | Understand how survey language variants load |

The runtime is Docker Compose. Everything an operator needs is in `deploy/`; the `deploy/README.md`
holds a short quickstart that points back here.
