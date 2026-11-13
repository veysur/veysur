jest.useRealTimers()

import {
  expectValidAndStrict,
  schemaBehaviour,
} from '../../test-utils/schemaEquivalence'
import { SchemaSurveyParticipantAttributeLanguageSnapshot } from './SurveyParticipantAttributeLanguageSnapshot.schema'

it('SchemaSurveyParticipantAttributeLanguageSnapshot validates as recorded and rejects unknown keys', async () => {
  const behaviour = await schemaBehaviour(
    new SchemaSurveyParticipantAttributeLanguageSnapshot(),
    {
      _id: 'i1',
      snapshotId: 'n1',
      surveyId: 's1',
      languageCode: 'en',
      data: {},
      contentHash: 'a'.repeat(64),
    },
  )
  expectValidAndStrict(behaviour)
  expect(behaviour).toMatchSnapshot()
})
