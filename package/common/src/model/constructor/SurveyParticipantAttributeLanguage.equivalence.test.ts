jest.mock('@datacapy/id', () => ({
  ...jest.requireActual('@datacapy/id'),
  genUniqueId: jest.fn(),
}))

import { constructorBehaviour } from '../../test-utils/constructorEquivalence'
import { surveyParticipantAttributeLanguageSpec } from '../schema/SchemaSurveyParticipantAttributeLanguage'
import { SurveyParticipantAttributeLanguage } from './SurveyParticipantAttributeLanguage'

it('SurveyParticipantAttributeLanguage behaves as recorded', () => {
  expect(
    constructorBehaviour(
      SurveyParticipantAttributeLanguage,
      surveyParticipantAttributeLanguageSpec,
    ),
  ).toMatchSnapshot()
})
