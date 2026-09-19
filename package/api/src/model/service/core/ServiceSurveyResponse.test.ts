import { ServiceSurveyResponse } from './ServiceSurveyResponse'

describe('ServiceSurveyResponse', () => {
  let service: ServiceSurveyResponse
  let mockRepoSurveyResponse: {
    insertOne: jest.Mock
    findOne: jest.Mock
    find: jest.Mock
    count: jest.Mock
    updateOne: jest.Mock
    deleteOne: jest.Mock
    deleteMany: jest.Mock
  }
  let mockRepoSurveySnapshot: { findOne: jest.Mock }

  beforeEach(() => {
    jest.clearAllMocks()

    service = new ServiceSurveyResponse()

    mockRepoSurveyResponse = {
      insertOne: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      updateOne: jest.fn().mockResolvedValue(undefined),
      deleteOne: jest.fn().mockResolvedValue(undefined),
      deleteMany: jest.fn().mockResolvedValue(undefined),
    }

    mockRepoSurveySnapshot = { findOne: jest.fn().mockResolvedValue(null) }

    jest.spyOn(service, 'getRepo').mockImplementation(((name: string) => {
      const map: Record<string, unknown> = {
        surveyResponse: mockRepoSurveyResponse,
        surveyParticipant: { find: jest.fn().mockResolvedValue([]) },
        surveySnapshot: mockRepoSurveySnapshot,
      }
      return map[name] ?? {}
    }) as typeof service.getRepo)
  })

  describe('create', () => {
    test('stamps survey/snapshot/publication/createdBy onto the response before inserting', async () => {
      const response = { answers: { q1: 'a' } }

      const result = await service.create({
        response,
        surveyId: 'survey_1',
        snapshotId: 'snapshot_1',
        publicationId: 'publication_1',
        projectId: 'proj_1',
        aclContext: { jwt: { _id: 'user_1' } },
      })

      expect(mockRepoSurveyResponse.insertOne).toHaveBeenCalled()
      expect(result.surveyId).toBe('survey_1')
      expect(result.snapshotId).toBe('snapshot_1')
      expect(result.publicationId).toBe('publication_1')
      expect(result.createdById).toBe('user_1')
    })

    test('anonymous survey: strips participant id and stamps sentinel timestamps', async () => {
      mockRepoSurveySnapshot.findOne.mockResolvedValue({
        survey: { access: { anonymous: true } },
      })

      await service.create({
        response: {
          answers: { q1: 'a' },
          participantId: 'p_1',
          completedAt: new Date('2026-01-01'),
        },
        surveyId: 'survey_1',
        snapshotId: 'snapshot_1',
        projectId: 'proj_1',
        aclContext: { jwt: { _id: 'user_1' } },
      })

      const inserted = mockRepoSurveyResponse.insertOne.mock.calls[0][0]
      expect(inserted.participantId).toBeNull()
      expect(inserted.ip).toBeNull()
      expect(new Date(inserted.createdAt).toISOString()).toBe(
        '1971-01-01T00:00:01.000Z',
      )
      expect(new Date(inserted.completedAt).toISOString()).toBe(
        '1971-01-01T00:00:01.000Z',
      )
    })

    test('defaults publicationId to null when not provided', async () => {
      const result = await service.create({
        response: { answers: { q1: 'a' } },
        surveyId: 'survey_1',
        snapshotId: 'snapshot_1',
        projectId: 'proj_1',
        aclContext: { jwt: { _id: 'user_1' } },
      })

      expect(result.publicationId).toBeNull()
    })

    test('inserts a completed manually created response without touching subscription usage', async () => {
      // Manually created responses never count toward any plan-level usage
      // limit a commercial edition may enforce, regardless of completion.
      const result = await service.create({
        response: { answers: { q1: 'a' }, completedAt: new Date('2026-01-01') },
        surveyId: 'survey_1',
        snapshotId: 'snapshot_1',
        projectId: 'proj_1',
        aclContext: { jwt: { _id: 'user_1' } },
      })

      expect(mockRepoSurveyResponse.insertOne).toHaveBeenCalled()
      expect(result.completedAt).toEqual(new Date('2026-01-01'))
    })
  })

  describe('getOne', () => {
    test('scopes the lookup by responseId and surveyId', async () => {
      mockRepoSurveyResponse.findOne.mockResolvedValue({ _id: 'resp_1' })

      await service.getOne({
        responseId: 'resp_1',
        surveyId: 'survey_1',
        projectId: 'proj_1',
      })

      expect(mockRepoSurveyResponse.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: 'resp_1',
          surveyId: 'survey_1',
        }),
        expect.any(Object),
      )
    })

    test('throws NotFound when no matching response exists', async () => {
      mockRepoSurveyResponse.findOne.mockResolvedValue(null)

      await expect(
        service.getOne({
          responseId: 'resp_1',
          surveyId: 'survey_1',
          projectId: 'proj_1',
        }),
      ).rejects.toThrow('Survey response not found')
    })
  })

  describe('update', () => {
    test('strips identity fields from the update payload so they cannot be reassigned', async () => {
      const response = {
        _id: 'attacker-id',
        surveyId: 'attacker-survey',
        snapshotId: 'attacker-snapshot',
        projectId: 'attacker-project',
        createdAt: new Date('2020-01-01'),
        answers: { q1: 'edited' },
      }

      await service.update({
        responseId: 'resp_1',
        surveyId: 'survey_1',
        projectId: 'proj_1',
        response,
      })

      const setArg = mockRepoSurveyResponse.updateOne.mock.calls[0][1].$set
      expect(setArg._id).toBeUndefined()
      expect(setArg.surveyId).toBeUndefined()
      expect(setArg.snapshotId).toBeUndefined()
      expect(setArg.createdAt).toBeUndefined()
      expect(setArg.updatedAt).toBeInstanceOf(Date)
      expect(setArg.answers).toEqual({ q1: 'edited' })
    })

    test('scopes the update by responseId and surveyId together', async () => {
      await service.update({
        responseId: 'resp_1',
        surveyId: 'survey_1',
        projectId: 'proj_1',
        response: {},
      })

      expect(mockRepoSurveyResponse.updateOne).toHaveBeenCalledWith(
        { _id: 'resp_1', surveyId: 'survey_1' },
        expect.any(Object),
        expect.any(Object),
      )
    })

    test('anonymous survey: nulls the participant id and uses the sentinel updatedAt', async () => {
      mockRepoSurveyResponse.findOne.mockResolvedValue({
        _id: 'resp_1',
        snapshotId: 'snapshot_1',
      })
      mockRepoSurveySnapshot.findOne.mockResolvedValue({
        survey: { access: { anonymous: true } },
      })

      await service.update({
        responseId: 'resp_1',
        surveyId: 'survey_1',
        projectId: 'proj_1',
        response: { participantId: 'p_1', completed: true, answers: {} },
      })

      const setArg = mockRepoSurveyResponse.updateOne.mock.calls[0][1].$set
      expect(setArg.participantId).toBeNull()
      expect(new Date(setArg.updatedAt).toISOString()).toBe(
        '1971-01-01T00:00:01.000Z',
      )
      expect(new Date(setArg.completedAt).toISOString()).toBe(
        '1971-01-01T00:00:01.000Z',
      )
    })
  })

  describe('delete', () => {
    test('single id deletes one record scoped by surveyId', async () => {
      const result = await service.delete({
        responseId: 'resp_1',
        surveyId: 'survey_1',
        projectId: 'proj_1',
      })

      expect(mockRepoSurveyResponse.deleteOne).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: 'resp_1',
          surveyId: 'survey_1',
        }),
        expect.any(Object),
      )
      expect(result).toEqual({ deletedCount: 1 })
    })

    test('comma-separated ids trigger a bulk delete and return the actual matched count', async () => {
      mockRepoSurveyResponse.find.mockResolvedValue([
        { _id: 'resp_1' },
        { _id: 'resp_2' },
      ])

      const result = await service.delete({
        responseId: 'resp_1, resp_2, resp_missing',
        surveyId: 'survey_1',
        projectId: 'proj_1',
      })

      expect(mockRepoSurveyResponse.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: { $in: ['resp_1', 'resp_2', 'resp_missing'] },
        }),
        expect.any(Object),
      )
      // count reflects what was actually found, not the number of ids requested
      expect(result).toEqual({ deletedCount: 2 })
    })
  })

  describe('getForParticipant', () => {
    test('returns null (not an empty wrapper) when no response exists yet', async () => {
      mockRepoSurveyResponse.findOne.mockResolvedValue(null)

      const result = await service.getForParticipant({
        aclContext: {
          surveyId: 'survey_1',
          snapshotId: 'snapshot_1',
          projectId: 'proj_1',
          participantId: 'participant_1',
        },
      })

      expect(result).toBeNull()
    })

    test('wraps an existing response under a `response` key', async () => {
      mockRepoSurveyResponse.findOne.mockResolvedValue({ _id: 'resp_1' })

      const result = await service.getForParticipant({
        aclContext: {
          surveyId: 'survey_1',
          snapshotId: 'snapshot_1',
          projectId: 'proj_1',
          participantId: 'participant_1',
        },
      })

      expect(result).toEqual({ response: { _id: 'resp_1' } })
    })
  })

  describe('getAll', () => {
    beforeEach(() => {
      mockRepoSurveyResponse.count.mockResolvedValue(0)
      mockRepoSurveyResponse.find.mockResolvedValue([])
    })

    test('completed filter alone sets the OR condition directly on the query', async () => {
      await service.getAll({
        surveyId: 'survey_1',
        snapshotId: undefined,
        publicationId: undefined,
        projectId: 'proj_1',
        completed: 'completed',
        startDate: undefined,
        endDate: undefined,
        dateField: undefined,
        search: undefined,
        merged: undefined,
      })

      const queryArg = mockRepoSurveyResponse.find.mock.calls[0][0]
      expect(queryArg.$or).toEqual([
        { completed: true },
        { completedAt: { $ne: null } },
      ])
      expect(queryArg.$and).toBeUndefined()
    })

    test('search filter alone sets the OR condition directly on the query', async () => {
      await service.getAll({
        surveyId: 'survey_1',
        snapshotId: undefined,
        publicationId: undefined,
        projectId: 'proj_1',
        completed: undefined,
        startDate: undefined,
        endDate: undefined,
        dateField: undefined,
        search: 'jane',
        merged: undefined,
      })

      const queryArg = mockRepoSurveyResponse.find.mock.calls[0][0]
      expect(queryArg.$or).toBeDefined()
      expect(queryArg.$and).toBeUndefined()
    })

    test('completed + search together combine via $and instead of colliding on $or', async () => {
      await service.getAll({
        surveyId: 'survey_1',
        snapshotId: undefined,
        publicationId: undefined,
        projectId: 'proj_1',
        completed: 'completed',
        startDate: undefined,
        endDate: undefined,
        dateField: undefined,
        search: 'jane',
        merged: undefined,
      })

      const queryArg = mockRepoSurveyResponse.find.mock.calls[0][0]
      expect(queryArg.$or).toBeUndefined()
      expect(queryArg.$and).toHaveLength(2)
      expect(queryArg.$and[0]).toEqual({
        $or: [{ completed: true }, { completedAt: { $ne: null } }],
      })
      expect(queryArg.$and[1].$or).toBeDefined()
    })

    test('merged filter coexists with the completed+search $and combination', async () => {
      await service.getAll({
        surveyId: 'survey_1',
        snapshotId: undefined,
        publicationId: undefined,
        projectId: 'proj_1',
        completed: 'completed',
        startDate: undefined,
        endDate: undefined,
        dateField: undefined,
        search: 'jane',
        merged: 'notMerged',
      })

      const queryArg = mockRepoSurveyResponse.find.mock.calls[0][0]
      expect(queryArg.$nor).toEqual([{ 'merge.fromSnapshotId': { $ne: null } }])
      expect(queryArg.$and).toHaveLength(2)
    })
  })
})
