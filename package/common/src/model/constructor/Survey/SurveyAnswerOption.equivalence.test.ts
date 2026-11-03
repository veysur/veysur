jest.mock('@datacapy/id', () => ({
  ...jest.requireActual('@datacapy/id'),
  genUniqueId: jest.fn(),
}))

import { constructorBehaviour } from '../../../test-utils/constructorEquivalence'
import { surveyAnswerOptionSpec } from '../../schema/SchemaSurveyAnswerOption'
import { SurveyAnswerOption } from './SurveyAnswerOption'

it('SurveyAnswerOption behaves as recorded', () => {
  expect(
    constructorBehaviour(SurveyAnswerOption, surveyAnswerOptionSpec),
  ).toMatchSnapshot()
})
