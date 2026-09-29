---
"veysur-api": patch
---

Move to Express 5 (via @datacapy/server). The optional `olderThan` segment of the hard file-delete route is now `/hard{/:olderThan}`, and the local storage routes use the named wildcard `/*key`. Request behaviour is unchanged.
