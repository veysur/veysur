---
"veysur-api": minor
"veysur-app": minor
"veysur-common": minor
"veysur-docsite": minor
---

Open surveys now stop the same browser completing them more than once, using a flag in the browser's local storage, which also works inside embedded surveys. The `preventRepeat` access setting defaults to on and has a switch in the Access settings. The retired `access.repeatCookie` setting, renamed `access.preventRepeat`, is removed from stored data by a migration.
