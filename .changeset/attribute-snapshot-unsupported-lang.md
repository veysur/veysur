---
'veysur-api': patch
---

Stop the participant attribute snapshot endpoint returning a server error for an unsupported `lang` query parameter. A value such as `en-GB`, an unknown code or a repeated parameter failed language code validation. It now falls back to the survey's default language.
