jest.mock('@datacapy/id', () => ({
  ...jest.requireActual('@datacapy/id'),
  genUniqueId: jest.fn(),
}))

import { constructorBehaviour } from '../../../test-utils/constructorEquivalence'
import { surveySubquestionSpec } from '../../schema/SchemaSurveySubquestion'
import { SurveySubquestion } from './SurveySubquestion'

it('SurveySubquestion behaves as recorded', () => {
  expect(
    constructorBehaviour(SurveySubquestion, surveySubquestionSpec),
  ).toMatchSnapshot()
})
