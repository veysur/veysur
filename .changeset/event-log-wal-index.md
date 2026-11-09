---
'veysur-api': patch
---

Stop the event-log Redis flush scanning the whole keyspace. Write-ahead log entries are now tracked in a `wal:index` sorted set, so the flush and startup recovery cost does not grow with the number of keys in Redis. This also fixes the key-prefix mismatch that stopped the old scan from finding any entries. Dead-letter entries now expire after `DLQ_TTL_SECONDS` (default 7 days).
