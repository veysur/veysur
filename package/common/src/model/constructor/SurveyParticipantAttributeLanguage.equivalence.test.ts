jest.mock('@datacapy/id', () => ({
  ...jest.requireActual('@datacapy/id'),
  genUniqueId: jest.fn(),
}))

import { constructorBehaviour } from '../../test-utils/constructorEquivalence'
import { SchemaSurveyParticipantAttributeLanguage } from './SurveyParticipantAttributeLanguage.schema'
import { SurveyParticipantAttributeLanguage } from './SurveyParticipantAttributeLanguage'

it('SurveyParticipantAttributeLanguage behaves as recorded', () => {
  expect(
    constructorBehaviour(
      SurveyParticipantAttributeLanguage,
      new SchemaSurveyParticipantAttributeLanguage().builderFields(),
    ),
  ).toMatchSnapshot()
})
