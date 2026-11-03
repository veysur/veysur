jest.mock('@datacapy/id', () => ({
  ...jest.requireActual('@datacapy/id'),
  genUniqueId: jest.fn(),
}))

import { constructorBehaviour } from '../../test-utils/constructorEquivalence'
import { surveyLanguageSnapshotSpec } from '../schema/SchemaSurveyLanguageSnapshot'
import { SurveyLanguageSnapshot } from './SurveyLanguageSnapshot'

it('SurveyLanguageSnapshot behaves as recorded', () => {
  expect(
    constructorBehaviour(SurveyLanguageSnapshot, surveyLanguageSnapshotSpec),
  ).toMatchSnapshot()
})
