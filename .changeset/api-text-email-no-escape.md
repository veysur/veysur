---
'veysur-api': patch
---

Fix HTML entities appearing in the plain-text part of emails, which broke links such as the verification URL. Templates ending in `-text` are now compiled without HTML escaping.
