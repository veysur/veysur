jest.useRealTimers()

import {
  expectValidAndStrict,
  schemaBehaviour,
} from '../../test-utils/schemaEquivalence'
import { SchemaSurveyLanguageSnapshot } from './SurveyLanguageSnapshot.schema'

it('SchemaSurveyLanguageSnapshot validates as recorded and rejects unknown keys', async () => {
  const behaviour = await schemaBehaviour(new SchemaSurveyLanguageSnapshot(), {
    _id: 'i1',
    snapshotId: 'n1',
    surveyId: 's1',
    languageCode: 'en',
    contentHash: 'a'.repeat(64),
    data: { title: 'T' },
  })
  expectValidAndStrict(behaviour)
  expect(behaviour).toMatchSnapshot()
})
