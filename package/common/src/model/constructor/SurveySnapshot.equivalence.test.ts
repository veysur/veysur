jest.mock('@datacapy/id', () => ({
  ...jest.requireActual('@datacapy/id'),
  genUniqueId: jest.fn(),
}))

import { constructorCases } from '../../test-utils/constructorEquivalence'
import { SurveySnapshot } from './SurveySnapshot'

it('SurveySnapshot behaves as recorded', () => {
  expect(
    constructorCases(SurveySnapshot, {
      'no argument': [],
      empty: [{}],
      'unknown key': [{ $unknown: 1 }],
      '_id only': [{ _id: 'id1' }],
      'snapshotId only': [{ snapshotId: 's1' }],
      'survey null': [{ _id: 'id1', snapshotId: 's1', survey: null }],
      'survey empty': [{ _id: 'id1', snapshotId: 's1', survey: {} }],
      'survey typical': [
        {
          _id: 'id1',
          snapshotId: 's1',
          survey: {
            _id: 'sv1',
            createdById: 'u1',
            name: 'N',
            title: { en: 'T' },
          },
        },
      ],
    }),
  ).toMatchSnapshot()
})
