jest.useRealTimers()

import {
  expectValidAndStrict,
  schemaBehaviour,
} from '../../test-utils/schemaEquivalence'

it('SchemaSettingSurvey validates as recorded and rejects unknown keys', async () => {
  const { schemaManager } = await import('../schema-manager')
  const behaviour = await schemaBehaviour(
    schemaManager.getSchema('settingSurvey')!,
    { _id: 'id1' },
  )
  expectValidAndStrict(behaviour)
  expect(behaviour).toMatchSnapshot()
})
