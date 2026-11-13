jest.mock('@datacapy/id', () => ({
  ...jest.requireActual('@datacapy/id'),
  genUniqueId: jest.fn(),
}))

import { constructorBehaviour } from '../../test-utils/constructorEquivalence'
import { SchemaSurveyPublication } from './SurveyPublication.schema'
import { SurveyPublication } from './SurveyPublication'

it('SurveyPublication behaves as recorded', () => {
  expect(
    constructorBehaviour(
      SurveyPublication,
      new SchemaSurveyPublication().builderFields(),
    ),
  ).toMatchSnapshot()
})
