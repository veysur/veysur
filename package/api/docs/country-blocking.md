# Country Blocking

Optional mechanism for blocking access from specific countries, for legal or regulatory
reasons specific to a deployment. The self-hosted edition ships none of it enabled.

## Configuration

Country blocking is implemented through a composition seam: core defines the
`GeoServiceContract` (`package/api/src/model/common/platformServiceContracts.ts`) and
consults a `geo` collaborator resolved by name, skipping the check entirely when none is
registered (the plain self-hosted composition). A deployment that wants country blocking
supplies its own `geo` service implementing that contract, backed by whatever
IP-geolocation and country-list configuration it chooses.

## Enforcement points

### 1. Server-side registration rejection

Enforced independently of any frontend gate (a client-side redirect alone is bypassable via
direct API calls) at each registration path:

| Path | Service method |
|---|---|
| Email/password signup | `ServiceSignup.user()` (`package/api/src/model/service/ServiceSignup.ts`) |
| Survey participant registration | `ServiceAuthParticipant.register()` (`package/api/src/model/service/ServiceAuthParticipant.ts`) |

Each resolves the `geo` collaborator via `GeoServiceContract`, calls `detectCountry({ ip })`,
and rejects with `ServerErrorForbidden` if the resolved country is blocked. It is skipped
entirely if no `geo` service is registered. The `ip` is sourced from the request via the
endpoint's `data` map (`ip: { src: 'request' }`).

**Facebook signup** (`postFacebook` in `package/api/src/endpoint/shared/signup.ts`) declares an
`ip` field and an endpoint route, but no corresponding `facebook()` method exists on
`ServiceSignup`, so this signup path is currently unimplemented and has no country check. Add
one alongside the method when it is implemented.

### 2. Frontend gate (appAccount signup)

`CountryAccessGate` (`package/app/src/component/CountryAccessGate/`) wraps only the `/signup`
route in appAccount's `Router.tsx`, not the whole app, so an existing user can still log in
and manage their account. `useCountryAccess()` (`package/app/src/hook/useCountryAccess.ts`)
asks the server whether the visitor is blocked. If a `geo` service is not registered, or the
request errors, the hook fails open and nothing is blocked.

## Testing

With no `geo` service registered (the plain self-hosted composition), confirm the gate is
fully inert: `useCountryAccess()`/`useBlockedCountries()` fail open (no blocking), and
`/user` signup and participant registration are unaffected regardless of IP.
