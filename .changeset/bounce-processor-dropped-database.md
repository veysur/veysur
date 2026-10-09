---
'veysur-api': patch
---

Stop the bounce processor failing on bounce emails for deleted projects. A bounce that named a project whose database had been dropped raised "Unknown database", was never marked seen, and failed every run. It is now treated as an orphaned project: the suppression is recorded, the message is marked seen and the error is captured once.
