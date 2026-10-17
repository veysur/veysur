// cspell:disable
import { Survey, QUESTION_TYPE_YES_NO, QUESTION_TYPE_MAP } from 'veysur-common'

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
  it('aggregates a map question into grouped pins', async () => {
    const survey = new Survey({
      _id: 'survey-1',
      createdById: 'u1',
      name: 'Map survey',
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
          type: QUESTION_TYPE_MAP,
          sectionId: 'g1',
          text: { en: 'Where?' },
        },
      ],
      elementIds: ['q1'],
    })
    const service = buildService(survey)
    const repoResponse = asPrivate<ServiceSurveyStats, GetRepoOverride>(
      service,
    ).getRepo('surveyResponse') as { find: jest.Mock }
    repoResponse.find.mockResolvedValue([
      { answers: { Q001: { lat: 51.5074, lng: -0.1278, precision: 'exact' } } },
      { answers: { Q001: { lat: 51.5071, lng: -0.1281, precision: 'exact' } } },
      { answers: {} },
    ])

    const result = await service.getStats(args)

    expect(result.questionStats).toHaveLength(1)
    expect(result.questionStats[0].mapStats?.pinCount).toBe(2)
    expect(result.questionStats[0].mapStats?.points).toEqual([
      { lat: 51.507, lng: -0.128, count: 2 },
    ])
  })
})
