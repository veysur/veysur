jest.useRealTimers()

import {
  expectValidAndStrict,
  schemaBehaviour,
} from '../../test-utils/schemaEquivalence'
import { SchemaSurveyPublication } from './SurveyPublication.schema'

it('SchemaSurveyPublication validates as recorded and rejects unknown keys', async () => {
  const behaviour = await schemaBehaviour(new SchemaSurveyPublication(), {
    _id: 'p1',
    snapshotId: 'n1',
    surveyId: 's1',
    publishedById: 'u1',
  })
  expectValidAndStrict(behaviour)
  expect(behaviour).toMatchSnapshot()
})
