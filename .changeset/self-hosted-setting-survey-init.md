---
'veysur-api': patch
---

Self-hosted: create the project's survey settings at startup. Publishing a survey on a fresh install through the API failed with a 500 ("Setting survey not found") until the admin app had read the settings.
