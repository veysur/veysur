---
"veysur-api": minor
---

Field-encryption key rotation. Set `API_ENCRYPTION_KEYS` and `API_ENCRYPTION_ACTIVE_KEY_ID` to hold several keys and choose the one used for new values; the existing three variables still work as a single `default` key. A disabled `Field Encryption Rotation` task re-wraps stored values onto the active key. See `package/api/docs/encryption.md`.
