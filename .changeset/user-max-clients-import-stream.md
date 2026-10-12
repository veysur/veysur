---
'veysur-api': minor
'veysur-common': minor
---

Add an optional private per-user `maxClients` setting that overrides the default limit of five signed-in clients, clamped between 1 and 100. Add `ServiceImportExport.importFromStream` for importing an archive already in memory, used by seeds and fixtures. It is not exposed through an endpoint.
