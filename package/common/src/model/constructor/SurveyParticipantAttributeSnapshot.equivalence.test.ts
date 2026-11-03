jest.mock('@datacapy/id', () => ({
  ...jest.requireActual('@datacapy/id'),
  genUniqueId: jest.fn(),
}))

import { constructorBehaviour } from '../../test-utils/constructorEquivalence'
import { surveyParticipantAttributeSnapshotSpec } from '../schema/SchemaSurveyParticipantAttributeSnapshot'
import { SurveyParticipantAttributeSnapshot } from './SurveyParticipantAttributeSnapshot'

it('SurveyParticipantAttributeSnapshot behaves as recorded', () => {
  expect(
    constructorBehaviour(
      SurveyParticipantAttributeSnapshot,
      surveyParticipantAttributeSnapshotSpec,
    ),
  ).toMatchSnapshot()
})
