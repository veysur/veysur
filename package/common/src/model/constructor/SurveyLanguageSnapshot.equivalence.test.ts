jest.mock('@datacapy/id', () => ({
  ...jest.requireActual('@datacapy/id'),
  genUniqueId: jest.fn(),
}))

import { constructorBehaviour } from '../../test-utils/constructorEquivalence'
import { SchemaSurveyLanguageSnapshot } from './SurveyLanguageSnapshot.schema'
import { SurveyLanguageSnapshot } from './SurveyLanguageSnapshot'

it('SurveyLanguageSnapshot behaves as recorded', () => {
  expect(
    constructorBehaviour(
      SurveyLanguageSnapshot,
      new SchemaSurveyLanguageSnapshot().builderFields(),
    ),
  ).toMatchSnapshot()
})
