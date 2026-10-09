---
'veysur-api': patch
---

Name the failing IMAP stage in mail canary errors. ImapFlow reports connection, greeting and socket timeouts as a bare "Timeout", which made failed canary runs hard to diagnose. The error now includes the stage (connect, mailbox lock, fetch or delete), the IMAP host and port, and the error code.
