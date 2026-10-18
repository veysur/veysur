---
'veysur-api': patch
'veysur-common': patch
'veysur-app': patch
---

The project's Google Maps key and bot-protection settings now live in their own `settingProject` document instead of `settingSurvey`, and the bot-protection secret keys are encrypted at rest. A migration moves existing values and encrypts them, saving a key needs an encryption key to be configured, and the field-encryption rotation task has a second action, `reencryptProjectSettings`, for them. The project settings page saves through `PUT /setting-project/maps` and `PUT /setting-project/bot-protection`, and participant and embed payloads carry the map and bot-check settings as `settingProjectData`.
