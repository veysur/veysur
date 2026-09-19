# Auth Client Geolocation

IP geolocation stored on `UserClient` at first login from a new device, enabling detection of suspicious logins from unrecognised locations.

## How it works

When a login produces a brand-new client record (`clientOld` is null), the client IP is handed off to a fire-and-forget background lookup via the configured geo provider. The login response returns immediately — the geo update races independently and writes a `geo` sub-document onto the user-client record within roughly a second.

On repeat logins from the same device, `clientOld` is non-null and no lookup fires.

## Flow

```
Login request (new device)
  ↓
ServiceAuthDirect.loginDirect()
  ↓
clientOld = null → insertOne(clientData)   ← login response returned here
  ↓ (background)
lookupIp(clientIp)
  ↓
┌──────────────────────┬─────────────────────────────────┐
│ geo returned         │ null (private IP / API down)    │
│ updateOne $set: geo  │ skip — geo field absent         │
└──────────────────────┴─────────────────────────────────┘
```

## Stored data

`geo` sub-document on a `userClient` record:

```json
{
  "country": "United Kingdom",
  "countryCode": "GB",
  "region": "England",
  "regionCode": "ENG",
  "city": "London",
  "location": {
    "type": "Point",
    "coordinates": [-0.1257, 51.5085]
  },
  "timezone": "Europe/London"
}
```

`coordinates` follow GeoJSON order: `[longitude, latitude]`.

## Behaviour

| Scenario | Behaviour |
|---|---|
| First login from new device, public IP | geo lookup fires in background; `geo` populated within ~1s |
| Repeat login (client already exists) | no lookup — `clientOld` is non-null |
| Private/loopback IP (local dev) | `lookupIp` returns null immediately; `geo` field absent |
| geo provider unavailable | exception caught; warning logged; login unaffected |

## Key files

- [ServiceAuthDirect.ts](../src/model/service/ServiceAuthDirect.ts) — new-client creation and fire-and-forget geo update
- [ipLookup/](../src/model/common/ipLookup/) — provider adapter; `IpLookupService` + `IpApiProvider` (default HTTP) or `IpDbProvider` (local MySQL, country-only). See [`ipLookup/README.md`](../src/model/common/ipLookup/README.md).
- [UserClient.ts](../../common/src/model/constructor/UserClient.ts) — `geo` field definition
- [SchemaUserClient.ts](../../common/src/model/schema/SchemaUserClient.ts) — `geo` schema
