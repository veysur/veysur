jest.mock('@datacapy/id', () => ({
  ...jest.requireActual('@datacapy/id'),
  genUniqueId: jest.fn(),
}))

import { constructorBehaviour } from '../../../test-utils/constructorEquivalence'
import { surveyElementBaseSpec } from '../../schema/SchemaSurveyElement'
import { SurveyElementBase } from './SurveyElementBase'

it('SurveyElementBase behaves as recorded', () => {
  expect(
    constructorBehaviour(SurveyElementBase, surveyElementBaseSpec),
  ).toMatchSnapshot()
})
