jest.mock('@datacapy/id', () => ({
  ...jest.requireActual('@datacapy/id'),
  genUniqueId: jest.fn(),
}))

import { constructorBehaviour } from '../../test-utils/constructorEquivalence'
import { surveyParticipantSpec } from '../schema/SchemaSurveyParticipant'
import { SurveyParticipant } from './SurveyParticipant'

it('SurveyParticipant behaves as recorded', () => {
  expect(
    constructorBehaviour(SurveyParticipant, surveyParticipantSpec),
  ).toMatchSnapshot()
})
