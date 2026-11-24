---
'veysur-api': patch
---

Treat a MySQL duplicate-entry error as already written when flushing the event log. Only the MongoDB duplicate code was ignored, so a re-flushed entry logged "Duplicate entry" errors and could be moved to the dead letter queue.
