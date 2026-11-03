jest.mock('@datacapy/id', () => ({
  ...jest.requireActual('@datacapy/id'),
  genUniqueId: jest.fn(),
}))

import { constructorBehaviour } from '../../test-utils/constructorEquivalence'
import { surveyParticipantAttributeSpec } from '../schema/SchemaSurveyParticipantAttribute'
import { SurveyParticipantAttribute } from './SurveyParticipantAttribute'

it('SurveyParticipantAttribute behaves as recorded', () => {
  expect(
    constructorBehaviour(
      SurveyParticipantAttribute,
      surveyParticipantAttributeSpec,
    ),
  ).toMatchSnapshot()
})
