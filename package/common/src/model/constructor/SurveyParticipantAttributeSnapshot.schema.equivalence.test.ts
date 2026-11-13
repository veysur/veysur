jest.useRealTimers()

import {
  expectValidAndStrict,
  schemaBehaviour,
} from '../../test-utils/schemaEquivalence'
import { SchemaSurveyParticipantAttributeSnapshot } from './SurveyParticipantAttributeSnapshot.schema'

it('SchemaSurveyParticipantAttributeSnapshot validates as recorded and rejects unknown keys', async () => {
  const behaviour = await schemaBehaviour(
    new SchemaSurveyParticipantAttributeSnapshot(),
    {
      _id: 'i1',
      snapshotId: 'n1',
      surveyId: 's1',
      attributes: [],
      contentHash: 'a'.repeat(64),
    },
  )
  expectValidAndStrict(behaviour)
  expect(behaviour).toMatchSnapshot()
})
