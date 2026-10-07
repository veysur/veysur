---
'veysur-api': patch
---

Pass search text straight to `$regex`: datacapy now treats a string operand as a literal substring match, so the API no longer escapes it (the `escapeRegex` helper is removed). Searching for `_` or `%` no longer acts as a LIKE wildcard.
