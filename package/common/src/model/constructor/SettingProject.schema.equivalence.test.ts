jest.useRealTimers()

import {
  expectValidAndStrict,
  schemaBehaviour,
} from '../../test-utils/schemaEquivalence'
import { SchemaSettingProject } from './SettingProject.schema'

it('SchemaSettingProject validates as recorded and rejects unknown keys', async () => {
  const behaviour = await schemaBehaviour(new SchemaSettingProject(), {
    _id: 's1',
    maps: { googleApiKey: 'k', provider: 'google' },
    botProtection: {
      provider: 'cloudflare',
      cloudflare: { siteKey: 'a', secretKey: 'b' },
      google: { siteKey: 'c', secretKey: 'd' },
    },
  })
  expectValidAndStrict(behaviour)
  expect(behaviour).toMatchSnapshot()
})
