// cspell:disable
import { Survey, QUESTION_TYPE_YES_NO } from 'veysur-common'

import { ServiceSurveyStats } from './ServiceSurveyStats'
import { asPrivate } from '../../../../test-utils/asPrivate'

type GetRepoOverride = { getRepo: (name: string) => unknown }

function makeSurvey(): Survey {
  return new Survey({
    _id: 'survey-1',
    createdById: 'u1',
    name: 'Stats survey',
    language: { default: 'en', options: ['en'] },
    sections: [
      {
        _id: 'g1',
        surveyId: 'survey-1',
        createdById: 'u1',
        code: 'G001',
        name: { en: 'Group' },
      },
    ],
    sectionIds: ['g1'],
    elements: [
      {
        _id: 'q1',
        surveyId: 'survey-1',
        createdById: 'u1',
        code: 'Q001',
        type: QUESTION_TYPE_YES_NO,
        sectionId: 'g1',
        text: { en: 'Do you agree?' },
      },
      {
        _id: 'q2',
        surveyId: 'survey-1',
        createdById: 'u1',
        code: 'Q002',
        type: QUESTION_TYPE_YES_NO,
        sectionId: 'g1',
        text: { en: 'Are you sure?' },
      },
    ],
    elementIds: ['q1', 'q2'],
  }).addContent(
    'g1',
    {
      _id: 'c1',
      code: 'C001',
      type: 'contentText',
      text: { en: '<p>Some prose between the questions.</p>' },
    },
    { afterId: 'q1' },
  )
}

function buildService(survey: Survey) {
  const service = new ServiceSurveyStats()
  const responseFind = jest
    .fn()
    .mockResolvedValue([
      { answers: { Q001: true } },
      { answers: { Q001: false } },
      { answers: { Q001: true } },
    ])

  asPrivate<ServiceSurveyStats, GetRepoOverride>(service).getRepo = ((
    name: string,
  ) => {
    switch (name) {
      case 'surveySnapshotPartial':
        return {
          findOne: jest.fn().mockResolvedValue({
            _id: 'snap-1',
            surveyId: 'survey-1',
            surveyPartial: { language: { default: 'en', options: ['en'] } },
          }),
        }
      case 'surveySnapshot':
        return {
          findOne: jest
            .fn()
            .mockResolvedValue({ _id: 'snap-1', snapshotId: 'snap-1', survey }),
        }
      case 'surveyLanguageSnapshot':
        return { find: jest.fn().mockResolvedValue([]) }
      case 'surveyResponse':
        return { count: jest.fn().mockResolvedValue(3), find: responseFind }
      case 'surveyParticipant':
        return {}
      default:
        throw new Error(`Unexpected repo requested in test: ${name}`)
    }
  }) as unknown as GetRepoOverride['getRepo']

  return service
}

describe('ServiceSurveyStats.getStats', () => {
  const args = {
    surveyId: 'survey-1',
    snapshotId: 'snap-1',
    projectId: 'project-1',
    publicationId: undefined,
    completed: undefined,
    startDate: undefined,
    endDate: undefined,
    dateField: undefined,
    search: undefined,
  }

  it('produces stats for questions only, excluding interleaved content elements', async () => {
    const survey = makeSurvey()
    const result = await buildService(survey).getStats(args)

    expect(result.questionStats.map((q) => q.questionCode)).toEqual([
      'Q001',
      'Q002',
    ])
    expect(
      result.questionStats.some(
        (q) => q.questionId === 'c1' || q.questionCode === 'C001',
      ),
    ).toBe(false)
  })

  it('matches the pinned getStats output shape', async () => {
    const survey = makeSurvey()
    const result = await buildService(survey).getStats(args)

    expect(result).toMatchSnapshot()
  })
})
