---
'veysur-common': patch
---

`Logger` methods now serialise and forward every argument. Calls such as `logger.error(message, err)` previously dropped `err`, hiding the cause of failures in server logs.
