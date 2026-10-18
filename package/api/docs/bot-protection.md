<!-- cspell:ignore RECAPTCHA -->
# Bot protection

Optional and off by default. Nothing changes for a survey until a project chooses a provider and the survey's `access.botProtection` setting is on (set it as the project default or per survey).

## Settings

- `settingSurvey.botProtection`: `provider` (`none`, `simple`, `cloudflare`, `google`) and a `siteKey` and `secretKey` for each third-party provider. Secret keys are write-only: reads return `hasSecret`, a blank write keeps the stored key, and project settings archives exclude the whole block.
- `survey.botProtection` and `survey.maps`: the same shape with every field nullable. A null field inherits the project value, so a survey overrides the provider, each site key and each secret key independently. The survey's secrets are masked on reads and kept on a blank write exactly as the project's are (`mergeBotProtectionSecrets` with `nullInherits`, also applied to the editor's dotted-key patches). Survey exports omit both sections, and publishing does not copy them into snapshots, so no secret reaches participants or the embed bucket. The provider, keys and maps are resolved live (survey over project), not frozen at publish: `ServiceBotProtection.effectiveSetting` for the check and `getGatedSettingSurvey` for maps. A survey patch touching either refreshes the embed pointer.
- `access.botProtection`: the existing survey access flag. Project value is the default, a survey may override it.
- `resolveBotProtection()` in `veysur-common` returns the provider and site key a participant needs. A provider missing a key resolves to `none`, so a half-configured project never locks participants out.

## Flow

1. `POST /auth-participant/:surveyId` issues the participant JWT as before. When a check applies the JWT carries `botRequired: true, botVerified: false`, and the response names the provider and site key. A participant who already saved answers is issued `botVerified: true`.
2. The start step runs the provider, then calls `POST /auth-participant/:surveyId/bot-verify` with the widget token and the honeypot value. The API verifies against the provider with the project's secret and returns the same identity with `botVerified: true`.
3. `assertBotVerified()` rejects response saves and file upload URL and confirm calls with `ERROR_BOT_CHECK_FAILED` while `botRequired` is set and `botVerified` is not. Reads stay open. Tokens issued before the feature existed carry no claim and pass.

Embeds make no API call until the first answer. `useEmbedResponseSaver` runs the check right after authenticating, in a floating container that shows only if the provider asks the participant to act.

## Providers

- **Turnstile**: `interaction-only` widget, verified at Cloudflare's `siteverify`.
- **reCAPTCHA v3**: invisible, accepted at `API_BOT_PROTECTION_RECAPTCHA_MIN_SCORE` (default 0.5) or above.
- **simple** (shown as VeySur Bot Detection): `POST /auth-participant/:surveyId/bot-challenge` returns a signed challenge (`salt.bits.issuedAt.signature`, bound to the survey). The browser finds a nonce so that SHA-256 of `challenge:nonce` has `bits` leading zero bits, in a Web Worker. The API checks the signature, the age (at least `API_BOT_PROTECTION_MIN_SECONDS`, at most five minutes), the hash, and accepts each salt once (Redis `SET NX`, in-memory without Redis). Difficulty is `API_BOT_PROTECTION_POW_BITS` (default 18).

Both endpoints are rate limited under the `bot-protection` tier.

## Account forms (login, signup)

Login and signup carry the same `simple` proof of work, on by default. Set `API_ACCOUNT_BOT_CHECK=false` to turn it off. It needs no project setting, keys or third party, and uses the fixed `account` scope, so a survey challenge cannot be redeemed here or the reverse.

1. The form calls `POST /bot-protection/challenge` (rate limited under `bot-protection-account`). It returns `{ enabled: false }` when the check is off, otherwise `{ enabled: true, challenge, bits, minSeconds }`.
2. The browser solves it and sends `botCheck: { token, honeypot }` in the request body.
3. The endpoint calls `ServiceBotProtection.assertAccountBotCheck(botCheck)` before any lookup. It throws `ERROR_BOT_CHECK_FAILED` for a missing, malformed, expired, reused or honeypot-filled check.

A solution works once, and the check is bound to the form load, not the user.

### Adopting it in another form

- API: add `botCheck: { src: 'body', required: false }` to the endpoint's `data`, and call `await this.getService<ServiceBotProtection>('botProtection').assertAccountBotCheck(botCheck)` first in the service method. Add the endpoint to the rate-limit tier that suits it.
- App: call `useAccountBotCheck()`. Render `element` in the form, disable submit until `ready`, and pass `take()` as `botCheck` on submit. `take()` hands over the solution and starts a fresh check, so a failed submit needs nothing extra.
- Direct API callers (scripts, e2e) must fetch a challenge and solve it, or run with the check off.

## Privacy

Anonymous surveys pass no IP address to a provider and store nothing from the check. Cloudflare and Google receive browser data when their widget runs, so the project admin must disclose this and obtain consent where required. The admin form says so. The `simple` provider contacts no third party.
