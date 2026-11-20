jest.useRealTimers()

import { schemaBehaviour } from '../../test-utils/schemaEquivalence'
import { SchemaUserAccessToken } from './UserAccessToken.schema'

it('SchemaUserAccessToken validates as recorded', async () => {
  const behaviour = await schemaBehaviour(new SchemaUserAccessToken(), {
    token: 't1',
    ttl: 60,
    ip: '127.0.0.1',
    geo: {
      country: 'United Kingdom',
      countryCode: 'GB',
      region: 'England',
      regionCode: 'ENG',
      city: 'London',
      timezone: 'Europe/London',
      location: { type: 'Point', coordinates: [-0.12, 51.5] },
    },
    createdAt: new Date('2025-01-02T03:04:05.000Z'),
    expiresAt: new Date('2025-02-02T03:04:05.000Z'),
  })
  expect(behaviour).toMatchSnapshot()
})
