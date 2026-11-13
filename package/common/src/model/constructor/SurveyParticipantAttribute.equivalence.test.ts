jest.mock('@datacapy/id', () => ({
  ...jest.requireActual('@datacapy/id'),
  genUniqueId: jest.fn(),
}))

import { constructorBehaviour } from '../../test-utils/constructorEquivalence'
import { SchemaSurveyParticipantAttribute } from './SurveyParticipantAttribute.schema'
import { SurveyParticipantAttribute } from './SurveyParticipantAttribute'

it('SurveyParticipantAttribute behaves as recorded', () => {
  expect(
    constructorBehaviour(
      SurveyParticipantAttribute,
      new SchemaSurveyParticipantAttribute().builderFields(),
    ),
  ).toMatchSnapshot()
})
