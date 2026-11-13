jest.mock('@datacapy/id', () => ({
  ...jest.requireActual('@datacapy/id'),
  genUniqueId: jest.fn(),
}))

import { constructorBehaviour } from '../../test-utils/constructorEquivalence'
import { SchemaSurveyLanguage } from './SurveyLanguage.schema'
import { SurveyLanguage } from './SurveyLanguage'

it('SurveyLanguage behaves as recorded', () => {
  expect(
    constructorBehaviour(
      SurveyLanguage,
      new SchemaSurveyLanguage().builderFields(),
    ),
  ).toMatchSnapshot()
})
