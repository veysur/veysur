jest.mock('@datacapy/id', () => ({
  ...jest.requireActual('@datacapy/id'),
  genUniqueId: jest.fn(),
}))

import { constructorBehaviour } from '../../test-utils/constructorEquivalence'
import { surveyPublicationSpec } from '../schema/SchemaSurveyPublication'
import { SurveyPublication } from './SurveyPublication'

it('SurveyPublication behaves as recorded', () => {
  expect(
    constructorBehaviour(SurveyPublication, surveyPublicationSpec),
  ).toMatchSnapshot()
})
