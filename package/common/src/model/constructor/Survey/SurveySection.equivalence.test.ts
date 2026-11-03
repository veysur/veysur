jest.mock('@datacapy/id', () => ({
  ...jest.requireActual('@datacapy/id'),
  genUniqueId: jest.fn(),
}))

import { constructorBehaviour } from '../../../test-utils/constructorEquivalence'
import { surveySectionSpec } from '../../schema/SchemaSurveySection'
import { SurveySection } from './SurveySection'

it('SurveySection behaves as recorded', () => {
  expect(
    constructorBehaviour(SurveySection, surveySectionSpec),
  ).toMatchSnapshot()
})
