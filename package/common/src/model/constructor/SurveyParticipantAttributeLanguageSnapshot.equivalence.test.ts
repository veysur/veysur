jest.mock('@datacapy/id', () => ({
  ...jest.requireActual('@datacapy/id'),
  genUniqueId: jest.fn(),
}))

import { constructorBehaviour } from '../../test-utils/constructorEquivalence'
import { surveyParticipantAttributeLanguageSnapshotSpec } from '../schema/SchemaSurveyParticipantAttributeLanguageSnapshot'
import { SurveyParticipantAttributeLanguageSnapshot } from './SurveyParticipantAttributeLanguageSnapshot'

it('SurveyParticipantAttributeLanguageSnapshot behaves as recorded', () => {
  expect(
    constructorBehaviour(
      SurveyParticipantAttributeLanguageSnapshot,
      surveyParticipantAttributeLanguageSnapshotSpec,
    ),
  ).toMatchSnapshot()
})
