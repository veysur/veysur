jest.mock('@datacapy/id', () => ({
  ...jest.requireActual('@datacapy/id'),
  genUniqueId: jest.fn(),
}))

import { constructorBehaviour } from '../../test-utils/constructorEquivalence'
import { surveyLanguageSpec } from '../schema/SchemaSurveyLanguage'
import { SurveyLanguage } from './SurveyLanguage'

it('SurveyLanguage behaves as recorded', () => {
  expect(
    constructorBehaviour(SurveyLanguage, surveyLanguageSpec),
  ).toMatchSnapshot()
})
