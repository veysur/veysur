---
'veysur-api': patch
---

Fix a publish that was retried after a database deadlock leaving a publication without its snapshot. The transaction body now keeps its working state local, and the response merge no longer retries.
