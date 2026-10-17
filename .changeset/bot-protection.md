---
'veysur-app': minor
'veysur-api': minor
'veysur-common': minor
---

Optional bot protection for the survey start step. It is off by default. A project picks a provider (Cloudflare Turnstile, Google reCAPTCHA v3 or VeySur Bot Detection, a built-in proof-of-work check) and switches the bot check on for the project or per survey. Response and file writes need a verified participant token.

Login also needs a built-in proof-of-work check, on by default, with no setting or third party involved. Set `API_ACCOUNT_BOT_CHECK=false` to turn it off. Scripts that call `POST /auth-email-password/login` directly must fetch a challenge from `POST /bot-protection/challenge`, solve it, and send it as `botCheck`.
