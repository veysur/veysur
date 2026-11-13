jest.mock('@datacapy/id', () => ({
  ...jest.requireActual('@datacapy/id'),
  genUniqueId: jest.fn(),
}))

import { constructorBehaviour } from '../../test-utils/constructorEquivalence'
import { SchemaSurveyParticipantAttributeSnapshot } from './SurveyParticipantAttributeSnapshot.schema'
import { SurveyParticipantAttributeSnapshot } from './SurveyParticipantAttributeSnapshot'

it('SurveyParticipantAttributeSnapshot behaves as recorded', () => {
  expect(
    constructorBehaviour(
      SurveyParticipantAttributeSnapshot,
      new SchemaSurveyParticipantAttributeSnapshot().builderFields(),
    ),
  ).toMatchSnapshot()
})
