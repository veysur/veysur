---
'veysur-app': patch
---

Self-hosted: serve the Geist font. The nginx image did not include `/fonts/` and the Compose nginx config had no location for it, so every page load logged a 404 and fell back to the system font.
