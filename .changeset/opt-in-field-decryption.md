---
'veysur-api': patch
---

Encrypted fields (the two-factor secret and the bot-protection secret keys) are no longer decrypted on every read. Reads return the stored ciphertext; only two-factor login verification and bot verification decrypt them. Reads that only check whether a secret is set no longer pay for an RSA operation.
