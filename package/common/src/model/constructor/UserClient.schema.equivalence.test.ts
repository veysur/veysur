jest.useRealTimers()

import { schemaBehaviour } from '../../test-utils/schemaEquivalence'
import { schemaManager } from '../schema-manager'

it('SchemaUserClient validates as recorded', async () => {
  await schemaManager.init()
  const behaviour = await schemaBehaviour(
    schemaManager.getSchema('userClient'),
    {
      _id: 'c1',
      userId: 'u1',
      name: 'Laptop',
      geo: {
        country: 'United Kingdom',
        countryCode: 'GB',
        region: 'England',
        regionCode: 'ENG',
        city: 'London',
        timezone: 'Europe/London',
        location: { type: 'Point', coordinates: [-0.12, 51.5] },
      },
      accessToken: [],
    },
  )
  expect(behaviour).toMatchSnapshot()
})
