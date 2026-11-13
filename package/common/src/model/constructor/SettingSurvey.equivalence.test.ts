jest.mock('@datacapy/id', () => ({
  ...jest.requireActual('@datacapy/id'),
  genUniqueId: jest.fn(),
}))

import { constructorCases } from '../../test-utils/constructorEquivalence'
import { settingCases } from './SettingSurvey.equivalence.cases'
import { SettingSurvey } from './SettingSurvey'

it('SettingSurvey behaves as recorded', () => {
  expect(constructorCases(SettingSurvey, settingCases())).toMatchSnapshot()
})
