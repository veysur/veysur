jest.mock('@datacapy/id', () => ({
  ...jest.requireActual('@datacapy/id'),
  genUniqueId: jest.fn(),
}))

import { constructorCases } from '../../test-utils/constructorEquivalence'
import { settingCases } from './SettingSurvey.equivalence.cases'
import { Survey } from './Survey'

const OWN: Record<string, unknown> = {
  createdById: 'u1',
  name: ' <b>Name</b> ',
  title: { en: 'Title' },
  attributes: { a: 1 },
  sectionIds: ['s1'],
  elementIds: ['e1'],
  sections: [],
  elements: [],
}

it('Survey behaves as recorded', () => {
  const cases = settingCases()
  for (const [key, value] of Object.entries(OWN)) {
    cases[`${key}: undefined`] = [{ [key]: undefined }]
    cases[`${key}: null`] = [{ [key]: null }]
    cases[`${key}: typical`] = [{ [key]: value }]
  }
  cases['own typical'] = [OWN]
  expect(constructorCases(Survey, cases)).toMatchSnapshot()
})
