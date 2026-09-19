// cspell:ignore Département
import { ServiceSurveyParticipantAttributeSnapshot } from './ServiceSurveyParticipantAttributeSnapshot'

describe('ServiceSurveyParticipantAttributeSnapshot', () => {
  let service: ServiceSurveyParticipantAttributeSnapshot
  let mockRepoAttribute: { findOne: jest.Mock }
  let mockRepoAttributeLanguage: { find: jest.Mock }
  let mockRepoSurvey: { findOne: jest.Mock }
  let mockRepoSettingSurvey: { findOne: jest.Mock }
  let mockRepoPublication: { findOne: jest.Mock }
  let mockRepoAttrSnapshot: { findOne: jest.Mock }
  let mockRepoAttrLangSnapshot: { find: jest.Mock }
  let mockRepoSurveySnapshotPartial: { findOne: jest.Mock }

  beforeEach(() => {
    jest.clearAllMocks()

    service = new ServiceSurveyParticipantAttributeSnapshot()

    mockRepoAttribute = { findOne: jest.fn().mockResolvedValue(null) }
    mockRepoAttributeLanguage = { find: jest.fn().mockResolvedValue([]) }
    mockRepoSurvey = { findOne: jest.fn().mockResolvedValue(null) }
    mockRepoSettingSurvey = { findOne: jest.fn().mockResolvedValue(null) }
    // Return a publication so the service doesn't short-circuit. By default return null for
    // the partial-survey snapshot so the service falls back to the live-data path these
    // tests exercise; the snapshot-path tests below override it.
    mockRepoPublication = {
      findOne: jest.fn().mockResolvedValue({ snapshotId: 'snap1' }),
    }
    mockRepoAttrSnapshot = { findOne: jest.fn().mockResolvedValue(null) }
    mockRepoAttrLangSnapshot = { find: jest.fn().mockResolvedValue([]) }
    mockRepoSurveySnapshotPartial = {
      findOne: jest.fn().mockResolvedValue(null),
    }

    jest.spyOn(service, 'getRepo').mockImplementation(((name: string) => {
      const map: Record<string, unknown> = {
        surveyParticipantAttribute: mockRepoAttribute,
        surveyParticipantAttributeLanguage: mockRepoAttributeLanguage,
        survey: mockRepoSurvey,
        settingSurvey: mockRepoSettingSurvey,
        surveyPublication: mockRepoPublication,
        surveyParticipantAttributeSnapshot: mockRepoAttrSnapshot,
        surveyParticipantAttributeLanguageSnapshot: mockRepoAttrLangSnapshot,
        surveySnapshotPartial: mockRepoSurveySnapshotPartial,
      }
      return map[name] ?? {}
    }) as typeof service.getRepo)
  })

  test('returns an empty array when there are no custom attributes', async () => {
    const result = await service.get({ surveyId: 's1', projectId: 'p1' })

    expect(result.attributes).toEqual([])
  })

  test('excludes internal attributes', async () => {
    mockRepoAttribute.findOne.mockResolvedValue({
      _id: 'doc1',
      attributes: [
        { name: 'department', required: true, internal: false, example: null },
        {
          name: 'internalNote',
          required: false,
          internal: true,
          example: null,
        },
      ],
    })

    const result = await service.get({ surveyId: 's1', projectId: 'p1' })

    expect(result.attributes).toHaveLength(1)
    expect(result.attributes[0].name).toBe('department')
  })

  test('resolves label/description for the requested language, falling back to the survey default', async () => {
    mockRepoSurvey.findOne.mockResolvedValue({
      _id: 's1',
      language: { default: 'fr', options: ['fr', 'en'] },
    })
    mockRepoAttribute.findOne.mockResolvedValue({
      _id: 'doc1',
      surveyId: 's1',
      projectId: 'p1',
      attributes: [
        {
          name: 'department',
          required: true,
          internal: false,
          example: 'Sales',
        },
        { name: 'region', required: false, internal: false, example: null },
      ],
    })
    mockRepoAttributeLanguage.find.mockResolvedValue([
      {
        languageCode: 'en',
        data: {
          department: {
            label: 'Department',
            description: 'Department of the participant',
          },
        },
      },
      {
        languageCode: 'fr',
        data: { department: { label: 'Département' } },
      },
    ])

    const result = await service.get({
      surveyId: 's1',
      projectId: 'p1',
      lang: 'en',
    })

    expect(result.attributes).toEqual([
      {
        name: 'department',
        label: 'Department',
        description: 'Department of the participant',
        required: true,
        example: 'Sales',
      },
      {
        name: 'region',
        label: 'region',
        description: undefined,
        required: false,
        example: null,
      },
    ])
  })

  test('falls back to the survey default language when the requested language has no data', async () => {
    mockRepoSurvey.findOne.mockResolvedValue({
      _id: 's1',
      language: { default: 'fr', options: ['fr', 'en'] },
    })
    mockRepoAttribute.findOne.mockResolvedValue({
      _id: 'doc1',
      attributes: [
        { name: 'department', required: true, internal: false, example: null },
      ],
    })
    mockRepoAttributeLanguage.find.mockResolvedValue([
      {
        languageCode: 'fr',
        data: { department: { label: 'Département' } },
      },
    ])

    const result = await service.get({
      surveyId: 's1',
      projectId: 'p1',
      lang: 'de',
    })

    expect(result.attributes[0].label).toBe('Département')
  })

  test('does not pass an undefined language code to the live-data query when lang is omitted', async () => {
    mockRepoSurvey.findOne.mockResolvedValue({
      _id: 's1',
      language: { default: 'en', options: ['en', 'de'] },
    })

    await service.get({ surveyId: 's1', projectId: 'p1' })

    const query = mockRepoAttributeLanguage.find.mock.calls[0][0]
    expect(query.languageCode.$in).not.toContain(undefined)
    expect(query.languageCode.$in).toEqual(['en'])
  })

  describe('published survey with a partial-survey snapshot', () => {
    beforeEach(() => {
      mockRepoSurveySnapshotPartial.findOne.mockResolvedValue({
        _id: 'snap1',
        surveyPartial: {
          language: { default: 'en', options: ['en', 'de'] },
        },
      })
    })

    test('returns the snapshot language options even when the survey has no participant attributes', async () => {
      // No surveyParticipantAttributeSnapshot row exists for attribute-free surveys.
      mockRepoAttrSnapshot.findOne.mockResolvedValue(null)

      const result = await service.get({ surveyId: 's1', projectId: 'p1' })

      expect(result.attributes).toEqual([])
      expect(result.languageDefault).toBe('en')
      expect(result.languageOptions).toEqual(['en', 'de'])
    })

    test('returns the same language options when a lang is supplied', async () => {
      mockRepoAttrSnapshot.findOne.mockResolvedValue(null)

      const result = await service.get({
        surveyId: 's1',
        projectId: 'p1',
        lang: 'en',
      })

      expect(result.languageOptions).toEqual(['en', 'de'])
    })
  })
})
