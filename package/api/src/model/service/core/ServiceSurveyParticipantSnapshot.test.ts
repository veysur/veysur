import { ServiceSurveyParticipantSnapshot } from './ServiceSurveyParticipantSnapshot'

describe('ServiceSurveyParticipantSnapshot.get()', () => {
  let service: ServiceSurveyParticipantSnapshot
  let mockRepoPublication: { findOne: jest.Mock }
  let mockRepoSurveySnapshotPartial: { findOne: jest.Mock }
  let mockRepoSurveySnapshot: { findOne: jest.Mock }
  let mockRepoSurveyLanguageSnapshot: { find: jest.Mock }
  let mockRepoSettingSurvey: { findOne: jest.Mock }
  let isNoBrandAvailableSpy: jest.SpyInstance

  const surveyId = 'survey_1'
  const projectId = 'proj_1'

  beforeEach(() => {
    jest.clearAllMocks()

    service = new ServiceSurveyParticipantSnapshot()

    mockRepoPublication = {
      findOne: jest.fn().mockResolvedValue({
        surveyId,
        projectId,
        snapshotId: 'snapshot_1',
        stoppedAt: null,
      }),
    }
    mockRepoSurveySnapshotPartial = {
      findOne: jest.fn().mockResolvedValue({
        _id: 'snapshot_1',
        surveyPartial: { language: { default: null } },
      }),
    }
    mockRepoSurveySnapshot = { findOne: jest.fn() }
    mockRepoSurveyLanguageSnapshot = { find: jest.fn() }
    mockRepoSettingSurvey = {
      findOne: jest.fn().mockResolvedValue({
        projectId,
        presentation: { noBrand: false },
      }),
    }

    jest.spyOn(service, 'getRepo').mockImplementation(((name: string) => {
      const map: Record<string, unknown> = {
        surveyPublication: mockRepoPublication,
        surveySnapshotPartial: mockRepoSurveySnapshotPartial,
        surveySnapshot: mockRepoSurveySnapshot,
        surveyLanguageSnapshot: mockRepoSurveyLanguageSnapshot,
        settingSurvey: mockRepoSettingSurvey,
      }
      return map[name] ?? {}
    }) as typeof service.getRepo)

    // Drive the (platform-only) NOBRAND gate through the core seam; the
    // guarded subclass and its own tests cover consulting the real plan.
    isNoBrandAvailableSpy = jest.spyOn(
      service as unknown as { isNoBrandAvailable: () => Promise<boolean> },
      'isNoBrandAvailable',
    )
  })

  test('publication lookup query does not filter on the removed projectId field', async () => {
    mockRepoSurveySnapshot.findOne.mockResolvedValue({
      snapshotId: 'snapshot_1',
      survey: { presentation: { noBrand: true } },
    })
    isNoBrandAvailableSpy.mockResolvedValue(true)

    await service.get({ surveyId, projectId, lang: null })

    expect(mockRepoPublication.findOne).toHaveBeenCalledWith(
      { surveyId, stoppedAt: null },
      expect.anything(),
    )
  })

  test('keeps survey presentation.noBrand true when the plan allows it', async () => {
    mockRepoSurveySnapshot.findOne.mockResolvedValue({
      snapshotId: 'snapshot_1',
      survey: { presentation: { noBrand: true } },
    })
    isNoBrandAvailableSpy.mockResolvedValue(true)

    const result = await service.get({ surveyId, projectId, lang: null })

    expect(result.snapshotData.survey.presentation.noBrand).toBe(true)
  })

  test('forces survey presentation.noBrand false when the current plan does not allow it, even though it was baked in as true at publish', async () => {
    mockRepoSurveySnapshot.findOne.mockResolvedValue({
      snapshotId: 'snapshot_1',
      survey: { presentation: { noBrand: true } },
    })
    isNoBrandAvailableSpy.mockResolvedValue(false)

    const result = await service.get({ surveyId, projectId, lang: null })

    expect(result.snapshotData.survey.presentation.noBrand).toBe(false)
    expect(isNoBrandAvailableSpy).toHaveBeenCalledWith(projectId)
  })

  test('leaves survey presentation.noBrand false untouched without checking the plan', async () => {
    mockRepoSurveySnapshot.findOne.mockResolvedValue({
      snapshotId: 'snapshot_1',
      survey: { presentation: { noBrand: false } },
    })

    const result = await service.get({ surveyId, projectId, lang: null })

    expect(result.snapshotData.survey.presentation.noBrand).toBe(false)
    expect(isNoBrandAvailableSpy).not.toHaveBeenCalled()
  })

  test('also gates the project-level settingSurveyData.presentation.noBrand', async () => {
    mockRepoSurveySnapshot.findOne.mockResolvedValue({
      snapshotId: 'snapshot_1',
      survey: { presentation: { noBrand: false } },
    })
    mockRepoSettingSurvey.findOne.mockResolvedValue({
      projectId,
      presentation: { noBrand: true },
    })
    isNoBrandAvailableSpy.mockResolvedValue(false)

    const result = await service.get({ surveyId, projectId, lang: null })

    expect(result.settingSurveyData.presentation.noBrand).toBe(false)
  })

  test('resumes against aclContext.snapshotId instead of the live publication when the participant has an in-progress response on an older snapshot', async () => {
    mockRepoSurveySnapshotPartial.findOne.mockResolvedValue({
      _id: 'snapshot_resumed',
      surveyPartial: { language: { default: null } },
    })
    mockRepoSurveySnapshot.findOne.mockResolvedValue({
      snapshotId: 'snapshot_resumed',
      survey: { presentation: { noBrand: false } },
    })

    const result = await service.get({
      surveyId,
      projectId,
      lang: null,
      aclContext: { snapshotId: 'snapshot_resumed' },
    })

    expect(mockRepoPublication.findOne).not.toHaveBeenCalled()
    expect(mockRepoSurveySnapshotPartial.findOne).toHaveBeenCalledWith(
      { _id: 'snapshot_resumed' },
      expect.anything(),
    )
    expect(result.snapshot._id).toBe('snapshot_resumed')
  })

  test('falls back to the live publication when aclContext has no snapshotId (e.g. anonymous open survey, first visit)', async () => {
    mockRepoSurveySnapshot.findOne.mockResolvedValue({
      snapshotId: 'snapshot_1',
      survey: { presentation: { noBrand: false } },
    })

    const result = await service.get({
      surveyId,
      projectId,
      lang: null,
      aclContext: {},
    })

    expect(mockRepoPublication.findOne).toHaveBeenCalledWith(
      { surveyId, stoppedAt: null },
      expect.anything(),
    )
    expect(result.snapshot._id).toBe('snapshot_1')
  })

  test('unchanged-snapshot republish: aclContext.snapshotId equal to the live snapshot behaves identically to the live-publication lookup', async () => {
    mockRepoSurveySnapshot.findOne.mockResolvedValue({
      snapshotId: 'snapshot_1',
      survey: { presentation: { noBrand: false } },
    })

    const result = await service.get({
      surveyId,
      projectId,
      lang: null,
      aclContext: { snapshotId: 'snapshot_1' },
    })

    expect(mockRepoPublication.findOne).not.toHaveBeenCalled()
    expect(mockRepoSurveySnapshotPartial.findOne).toHaveBeenCalledWith(
      { _id: 'snapshot_1' },
      expect.anything(),
    )
    expect(result.snapshot._id).toBe('snapshot_1')
  })
})
