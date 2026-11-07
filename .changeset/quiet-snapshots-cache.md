---
'veysur-api': patch
---

Cache the published snapshot on the response save path, and the live publication, survey view and bot-protection reads on participant auth, in a per-pod cache backed by shared Redis. This cuts database and ORM work per participant under load. Publishing, unpublishing and settings writes invalidate the cached entries.
