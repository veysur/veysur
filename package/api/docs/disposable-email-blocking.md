<!-- cspell:ignore mailinator guerrillamail -->

# Disposable Email Domain Blocking

Blocks new/updated email addresses at known disposable/temporary domains (mailinator.com,
guerrillamail.com, 10minutemail.com, etc.) — these are typically used to bypass
verification, farm free trials, or evade abuse consequences.

## Data source and table

`ServiceEmailDomainCheck` (`src/model/service/ServiceEmailDomainCheck.ts`) resolves an
`emailDomainBlock` repo by name and, if one is registered, calls `isBlocked(domain)`
against it; if none is registered it returns `false` unconditionally (`isDisposableEmailDomain`
is then a no-op). This repo is not part of this repository — a deployment that wants
domain blocking supplies its own `emailDomainBlock` repo implementation and data source.

## Enforcement points

All three paths that let a user set/change their own email call
`ServiceEmailDomainCheck.isDisposableEmailDomain(email)` and reject with
`ServerErrorBadRequest` (400) — not `ServerErrorForbidden` (403), to avoid colliding with
the existing 403 used for "account already exists":

| Path | Service method |
|---|---|
| Email/password signup | `ServiceSignup.user()` (`src/model/service/ServiceSignup.ts`) |
| Survey participant registration | `ServiceAuthParticipant.register()` (`src/model/service/ServiceAuthParticipant.ts`) |
| Account profile email change | `ServiceUser.putProfile()` (`src/model/service/ServiceUser.ts`) |

Each rejection carries `ref: 'ERROR_DISPOSABLE_EMAIL_DOMAIN'` so the frontend can show a
specific message instead of a generic error.

**Team invite** (`ServiceProjectAdmin.invite()`) is deliberately **not** checked — the
inviter, not the invitee, supplies the email; blocking it would punish legitimate admins
inviting colleagues, and it is not a self-registration/self-owned-email abuse vector.

## Frontend

`SignupForm.tsx` (appAccount signup), `RegistrationForm.tsx` (appSurvey participant
registration), and `useUserProfileEmail.ts` (appAccount profile email change) all check
`error.ref === 'ERROR_DISPOSABLE_EMAIL_DOMAIN'` and show a specific message ahead of their
generic error fallbacks. No client-side pre-check — the domain list lives server-side only.

## Testing

- With no `emailDomainBlock` repo registered (the plain self-hosted composition), the
  check is a no-op — any email domain is accepted.
- `pnpm test:api` covers `ServiceEmailDomainCheck`'s no-op-when-absent behaviour and the
  rejection paths in `ServiceSignup`/`ServiceAuthParticipant`/`ServiceUser` when a
  fake repo is injected.
