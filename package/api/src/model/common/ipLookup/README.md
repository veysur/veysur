<!-- cspell:ignore iplocate VARCHAR -->

# IP Lookup

Converts a public IP address to standardised location data via a swappable provider adapter.

## Files

```
ipLookup/
  IpLocation.ts           — canonical result interface
  IpLookupProvider.ts     — provider interface + isPublicIp utility
  IpLookupService.ts      — service class; guards private IPs, delegates to provider
  ipUtils.ts              — CIDR/IP-to-integer/hex conversion utilities
  provider/
    IpApiProvider.ts      — ip-api.com HTTP adapter (default)
    IpDbProvider.ts       — local MySQL database adapter (country-only)
  index.ts                — exports + default singleton (ipLookupService, lookupIp)
  ipLookup.test.ts        — unit tests for core service and IpApiProvider
  ipUtils.test.ts         — unit tests for IP conversion utilities
```

## Data shape

All providers return `IpLocation | null`:

```typescript
interface IpLocation {
  country: string // "United Kingdom"
  countryCode: string // "GB"
  region: string // "England"
  regionCode: string // "ENG"
  city: string
  lat: number
  lon: number
  timezone: string // "Europe/London"
}
```

## Usage

```typescript
import { lookupIp } from 'model/common'

const location = await lookupIp('8.8.8.8') // IpLocation | null
```

Private/loopback IPs return `null` without making any outbound call.

## Adding a new provider

1. Implement `IpLookupProvider`:

```typescript
import type { IpLookupProvider } from 'model/common/ipLookup/IpLookupProvider'

export class MaxMindProvider implements IpLookupProvider {
  readonly providerName = 'maxmind'

  async lookup(ip: string): Promise<IpLocation | null> {
    // ... database or HTTP lookup
  }
}
```

2. Wire it up in `ipLookup/index.ts` (or inject directly in tests):

```typescript
export const ipLookupService = new IpLookupService(new MaxMindProvider())
```

## IpDbProvider

Queries two local MySQL tables populated from the [iplocate ip-to-country dataset](https://github.com/iplocate/ip-address-databases).
Returns `country` and `countryCode` only — `region`, `city`, `lat`, `lon`, and `timezone` are empty/zero.

### Setup

1. Run the migration to create the tables: `pnpm migrate`
2. Download the CSV from the iplocate repository (extract the zip to get `ip-to-country.csv`)
3. Ingest (from `package/api-cloud` — the ingest CLI is cloud-only):
   `pnpm ingest-ip-country -- --csv /path/to/ip-to-country.csv [--truncate]`

### Wiring it up

```typescript
import { IpLookupService, IpDbProvider } from 'model/common'
import { RepoIpCountryV4, RepoIpCountryV6 } from 'model/repo'

const service = new IpLookupService(
  new IpDbProvider(
    modelManager.getRepo('ipCountryV4') as RepoIpCountryV4,
    modelManager.getRepo('ipCountryV6') as RepoIpCountryV6,
  ),
)
```

### Storage

| Table           | Column type                          | Notes                                                |
| --------------- | ------------------------------------ | ---------------------------------------------------- |
| `ip_country_v4` | `ip_from / ip_to`: `BIGINT UNSIGNED` | 32-bit unsigned integer                              |
| `ip_country_v6` | `ip_from / ip_to`: `VARCHAR(255)`    | 32-char zero-padded lowercase hex; sorts numerically |

---

## Testing with a mock provider

```typescript
const service = new IpLookupService({
  providerName: 'mock',
  lookup: jest.fn().mockResolvedValue({ countryCode: 'DE', ... }),
})
```
