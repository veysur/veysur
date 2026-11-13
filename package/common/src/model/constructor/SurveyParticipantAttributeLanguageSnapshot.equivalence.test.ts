jest.mock('@datacapy/id', () => ({
  ...jest.requireActual('@datacapy/id'),
  genUniqueId: jest.fn(),
}))

import { constructorBehaviour } from '../../test-utils/constructorEquivalence'
import { SchemaSurveyParticipantAttributeLanguageSnapshot } from './SurveyParticipantAttributeLanguageSnapshot.schema'
import { SurveyParticipantAttributeLanguageSnapshot } from './SurveyParticipantAttributeLanguageSnapshot'

it('SurveyParticipantAttributeLanguageSnapshot behaves as recorded', () => {
  expect(
    constructorBehaviour(
      SurveyParticipantAttributeLanguageSnapshot,
      new SchemaSurveyParticipantAttributeLanguageSnapshot().builderFields(),
    ),
  ).toMatchSnapshot()
})
