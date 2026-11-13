jest.useRealTimers()

import {
  expectValidAndStrict,
  schemaBehaviour,
} from '../../test-utils/schemaEquivalence'

it('SchemaSurveySnapshot validates as recorded and rejects unknown keys', async () => {
  const { schemaManager } = await import('../schema-manager')
  const behaviour = await schemaBehaviour(
    schemaManager.getSchema('surveySnapshot')!,
    {
      _id: 'id1',
      snapshotId: 's1',
      survey: {
        _id: 'sv1',
        createdById: 'u1',
        title: { en: 'T' },
        sections: [],
        elements: [],
      },
    },
  )
  expectValidAndStrict(behaviour)
  expect(behaviour).toMatchSnapshot()
})
