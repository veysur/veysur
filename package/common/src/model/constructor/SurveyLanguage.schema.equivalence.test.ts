jest.useRealTimers()

import {
  expectValidAndStrict,
  schemaBehaviour,
} from '../../test-utils/schemaEquivalence'
import { SchemaSurveyLanguage } from './SurveyLanguage.schema'

it('SchemaSurveyLanguage validates as recorded and rejects unknown keys', async () => {
  const behaviour = await schemaBehaviour(new SchemaSurveyLanguage(), {
    _id: 'i1',
    surveyId: 's1',
    languageCode: 'en',
    data: { title: 'T' },
  })
  expectValidAndStrict(behaviour)
  expect(behaviour).toMatchSnapshot()
})
