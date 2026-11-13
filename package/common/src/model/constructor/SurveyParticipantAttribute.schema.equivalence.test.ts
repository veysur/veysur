jest.useRealTimers()

import {
  expectValidAndStrict,
  schemaBehaviour,
} from '../../test-utils/schemaEquivalence'
import { SchemaSurveyParticipantAttribute } from './SurveyParticipantAttribute.schema'

it('SchemaSurveyParticipantAttribute validates as recorded and rejects unknown keys', async () => {
  const behaviour = await schemaBehaviour(
    new SchemaSurveyParticipantAttribute(),
    {
      _id: 'i1',
      surveyId: 's1',
      attributes: [
        { name: 'n', required: true, internal: false, example: null },
      ],
    },
  )
  expectValidAndStrict(behaviour)
  expect(behaviour).toMatchSnapshot()
})
