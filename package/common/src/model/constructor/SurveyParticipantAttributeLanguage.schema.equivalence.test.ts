jest.useRealTimers()

import {
  expectValidAndStrict,
  schemaBehaviour,
} from '../../test-utils/schemaEquivalence'
import { SchemaSurveyParticipantAttributeLanguage } from './SurveyParticipantAttributeLanguage.schema'

it('SchemaSurveyParticipantAttributeLanguage validates as recorded and rejects unknown keys', async () => {
  const behaviour = await schemaBehaviour(
    new SchemaSurveyParticipantAttributeLanguage(),
    {
      _id: 'i1',
      surveyId: 's1',
      languageCode: 'en',
      data: { n: { label: 'x' } },
    },
  )
  expectValidAndStrict(behaviour)
  expect(behaviour).toMatchSnapshot()
})
