<!-- cspell:ignore OAEP pubout pkey pkeygen keygen genpkey pkeyopt -->

# Field-Level Encryption

Opt-in at-rest encryption for individual schema fields using RSA+AES-256-GCM. Fields are
transparently encrypted before write and decrypted after read — no changes needed in
service or endpoint code beyond schema annotation and environment configuration.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `API_ENCRYPTION_PUBLIC_KEY` | Yes (to enable) | Base64-encoded RSA public key PEM |
| `API_ENCRYPTION_PRIVATE_KEY` | For decryption | Base64-encoded RSA private key PEM (omit on read-only nodes) |
| `API_ENCRYPTION_PRIVATE_KEY_PASSWORD` | If key is encrypted | Passphrase for the private key |
| `API_ENCRYPTION_KEYS` | Only to rotate | JSON array of `{ id, publicKey, privateKey?, privateKeyPassword? }`, each PEM base64-encoded. Replaces the three variables above when set |
| `API_ENCRYPTION_ACTIVE_KEY_ID` | With `API_ENCRYPTION_KEYS` | `id` of the key used for new values. Must be one of the listed ids |

Encryption is disabled when neither `API_ENCRYPTION_PUBLIC_KEY` nor `API_ENCRYPTION_KEYS` is set. The API starts
normally, but saving a value into an encrypted field then fails (the bot-protection settings return a 400 that
says an encryption key is needed). Values stored as plaintext before a field became encrypted are read as they
are and encrypted by a migration or the next write.

## Encrypted Fields

| Collection | Field |
|---|---|
| `user` | `twoFactorSecret` |
| `settingProject` (per project) | `botProtection.cloudflare.secretKey`, `botProtection.google.secretKey` |

Keys are stored base64-encoded (single line) to be compatible with the `key=value` format
used by `.env` files.

## Enabling Encryption on a Schema Field

Add `$filter: { encrypt: true }` to any `$type: String` field:

```typescript
const userSchema = new Schema({
  name: { $type: String },
  nationalId: { $type: String, $filter: { encrypt: true } },
})
```

The encryption service is propagated automatically from ModelManager to every schema that
does not define its own. No other code changes are needed.

## Key Generation

`deploy/scripts/config-generate.sh` generates a key pair and passphrase when none are set. To
provision keys yourself or rotate them, generate a new key pair manually:

```bash
# Generate 4096-bit private key with AES-256 passphrase
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:4096 -aes256 -out private.pem

# Extract public key
openssl rsa -in private.pem -pubout -out public.pem

# Encode for env var (produces single-line base64)
API_ENCRYPTION_PUBLIC_KEY=$(base64 -w 0 < public.pem)
API_ENCRYPTION_PRIVATE_KEY=$(base64 -w 0 < private.pem)
```

Store the passphrase you entered in `API_ENCRYPTION_PRIVATE_KEY_PASSWORD`.

## Rotating keys

Each stored value carries the id (`kid`) of the key that wrapped it. Values written before
key ids existed have none and count as the key with id `default`. With a single key set
through the three variables above, the key id is `default`.

`ServiceEncryptionRotation` re-wraps encrypted fields under the active key without ever producing
plaintext. Two actions of the `encryptionRotation` task cover the encrypted collections, each
seeded disabled by a migration: `reencryptUsers` (`2026-10-18_1000`, the `user` collection) and
`reencryptProjectSettings` (`2026-10-18_1200`, each project's `settingProject`; `batchSize`
counts projects). Enable both during a rotation. Each runs in batches, continues from a cursor
saved in the task's `options.afterId`, and can be repeated safely. Its result reports `byKid`,
the number of values found on each key before the run.

1. Back up the database.
2. Generate a new key pair (see Key Generation).
3. Set `API_ENCRYPTION_KEYS` to a list holding the current key and the new one, and leave
   `API_ENCRYPTION_ACTIVE_KEY_ID` on the current key. The current key's `id` must be `default`
   while stored values predate key ids. Deploy this to **every** node, including read-only
   ones (which need the private halves of every key they must read), and wait for the rollout
   to finish: an older build cannot parse envelopes written under a newer one.
4. Switch `API_ENCRYPTION_ACTIVE_KEY_ID` to the new key and deploy. New values now use it.
5. Enable the `Field Encryption Rotation` and `Field Encryption Rotation (project settings)` tasks. It starts with `dryRun: true`; read the first
   execution's result, then set `options.dryRun` to `false`.
6. Wait until a run of each reports `byKid` with zero values on the old key and `failed: 0`. A
   failed document is left unchanged; fix its cause and run again. Then disable the task.
7. Retire the old key only when no database backup that may still be restored holds values
   wrapped by it. Losing a key makes the values on it unreadable.

```bash
# dry run against the running dev stack
pnpm dev:task -- encryptionRotation reencryptUsers '{"dryRun":true}'
pnpm dev:task -- encryptionRotation reencryptProjectSettings '{"dryRun":true}'
```

See [task-manager.md](task-manager.md) for manual triggering and execution history.

## Limitations

- **Not queryable by value** — the database stores ciphertext; `find({ nationalId: '...' })` will not match.
- **String coercion** — numeric/boolean fields are returned as strings after decryption.
- **Envelope not bound to its field** — a ciphertext is not tied to its document or field, so it could be copied between fields (tracked in the security review).
- **Node.js only** — uses the built-in `crypto` module via `SchemaEncryptionServiceRsa`.

## References

- Implementation details: [`external/datacapy/package/om/docs/encryption.md`](../../../external/datacapy/package/om/docs/encryption.md)
- Configuration keys: [`docs/configuration.md`](../../../docs/configuration.md)
- ModelManager wiring: [`src/model-manager.ts`](../src/model-manager.ts)
