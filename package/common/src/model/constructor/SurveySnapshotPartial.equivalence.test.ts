jest.mock('@datacapy/id', () => ({
  ...jest.requireActual('@datacapy/id'),
  genUniqueId: jest.fn(),
}))

import { constructorBehaviour } from '../../test-utils/constructorEquivalence'
import { surveySnapshotPartialSpec } from '../schema/SchemaSurveySnapshotPartial'
import { SurveySnapshotPartial } from './SurveySnapshotPartial'

it('SurveySnapshotPartial behaves as recorded', () => {
  expect(
    constructorBehaviour(SurveySnapshotPartial, surveySnapshotPartialSpec),
  ).toMatchSnapshot()
})
