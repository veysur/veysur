# Country Blocking

Optional mechanism for blocking access from specific countries (e.g. for legal,
regulatory, or sanctions-compliance reasons specific to a given deployment).

## Configuration

Country blocking is implemented through a composition seam: core defines the
`GeoServiceContract` (`package/api/src/model/common/platformServiceContracts.ts`) and
consults a `geo` collaborator resolved by name, skipping the check entirely when none is
registered (the plain self-hosted composition). A deployment that wants country blocking
supplies its own `geo` service implementing that contract, backed by whatever
IP-geolocation and country-list configuration it chooses.

## Enforcement points

### 1. The `geo` collaborator

Core resolves `detectCountry(args)` / `isCountryBlocked(countryCode)` via the
`GeoServiceContract` seam and skips enforcement when no `geo` service is registered.
The frontend hooks below expect a `GET /platform/geo/access-check` and
`GET /platform/geo/blocked-countries` endpoint pair to exist; in the plain self-hosted
build neither exists, so both hooks fail open (see below).

### 2. Frontend gate — signup only (appAccount)

`CountryAccessGate` (`package/app/src/component/CountryAccessGate/`) wraps only the `/signup` route in appAccount's `Router.tsx` — not the whole app. This is deliberate: an existing user whose country is later added to the block list must still be able to log in, view billing, cancel a subscription, or otherwise settle their account. Only *new* signups are blocked at the frontend.

appAdmin, appPlatform and appSurvey do not use `CountryAccessGate` at all — appAdmin/appPlatform have no signup route of their own (account creation is exclusively an appAccount concept), and appSurvey intentionally has no country gating (survey-taking and participant registration are unaffected by country blocking at the frontend level; see server-side enforcement below).

`useCountryAccess()` (`package/app/src/hook/useCountryAccess.ts`) resolves country as:
1. Saved billing address country, if authenticated (`auth.user.billingAddress.country`).
2. Otherwise, server IP-based detection via `geo/access-check`.

If blocked, the gated route renders a "Service Unavailable in Your Country" card. **Fails open** if the `access-check` request errors (e.g. network failure).

Not applied to the docsite (no blocking needed).

### 3. Server-side registration rejection

Enforced independently of the frontend gate (a client-side redirect alone is bypassable via direct API calls) at each registration path:

| Path | Service method |
|---|---|
| Email/password signup | `ServiceSignup.user()` (`package/api/src/model/service/ServiceSignup.ts`) |
| Survey participant registration | `ServiceAuthParticipant.register()` (`package/api/src/model/service/ServiceAuthParticipant.ts`) |

Each resolves the `geo` collaborator via `GeoServiceContract`, calls `detectCountry({ ip })`, and rejects with `ServerErrorForbidden` if the resolved country is blocked — skipped entirely if no `geo` service is registered. The `ip` is sourced from the request via the endpoint's `data` map (`ip: { src: 'request' }`).

**Facebook signup** (`postFacebook` in `package/api/src/endpoint/shared/signup.ts`) declares an `ip` field and an endpoint route, but no corresponding `facebook()` method exists on `ServiceSignup` — this signup path is currently unimplemented, so no country check was added for it. Add one alongside the method when it is implemented.

## Testing

With no `geo` service registered (the plain self-hosted composition), confirm the gate is
fully inert: `useCountryAccess()`/`useBlockedCountries()` fail open (no blocking), and
`/user` signup and participant registration are unaffected regardless of IP.
