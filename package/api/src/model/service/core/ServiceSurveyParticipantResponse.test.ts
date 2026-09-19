import { ServiceSurveyParticipantResponse } from './ServiceSurveyParticipantResponse'
import { asPrivate } from 'test-utils/asPrivate'

type ServicePrivateOverrides = {
  modelManager: unknown
}

describe('ServiceSurveyParticipantResponse', () => {
  let service: ServiceSurveyParticipantResponse
  let mockRepoSurveyResponse: {
    findOne: jest.Mock
    updateOne: jest.Mock
    insertOne: jest.Mock
  }
  let mockRepoSurveySnapshot: { findOne: jest.Mock }
  let mockEventLog: { log: jest.Mock }
  let guardSpy: jest.SpyInstance
  let recordSpy: jest.SpyInstance
  let mockServiceSurveyCompletionEmail: { sendCompletionEmails: jest.Mock }

  const baseAclContext = () => ({
    surveyId: 'survey_1',
    snapshotId: 'snapshot_1',
    publicationId: 'pub_1',
    projectId: 'proj_1',
    participantId: 'participant_1',
    sessionId: undefined,
  })

  beforeEach(() => {
    jest.clearAllMocks()

    service = new ServiceSurveyParticipantResponse()

    mockRepoSurveyResponse = {
      findOne: jest.fn(),
      updateOne: jest.fn().mockResolvedValue(undefined),
      insertOne: jest.fn().mockResolvedValue(undefined),
    }
    mockRepoSurveySnapshot = { findOne: jest.fn() }

    jest.spyOn(service, 'getRepo').mockImplementation(((name: string) => {
      const map: Record<string, unknown> = {
        surveyResponse: mockRepoSurveyResponse,
        surveySnapshot: mockRepoSurveySnapshot,
      }
      return map[name] ?? {}
    }) as typeof service.getRepo)

    mockEventLog = { log: jest.fn().mockResolvedValue(undefined) }
    asPrivate<ServiceSurveyParticipantResponse, ServicePrivateOverrides>(
      service,
    ).modelManager = { services: { eventLog: mockEventLog } }

    // The RESPONSES limit / usage recording is platform-only; drive the core
    // first-answer seams directly. The guarded subclass tests cover the guard.
    type Seams = {
      onResponseFirstAnswerGuard: () => Promise<void>
      onResponseFirstAnswerRecorded: () => Promise<void>
    }
    guardSpy = jest
      .spyOn(service as unknown as Seams, 'onResponseFirstAnswerGuard')
      .mockResolvedValue(undefined)
    recordSpy = jest
      .spyOn(service as unknown as Seams, 'onResponseFirstAnswerRecorded')
      .mockResolvedValue(undefined)

    mockServiceSurveyCompletionEmail = {
      sendCompletionEmails: jest.fn().mockResolvedValue(undefined),
    }
    jest.spyOn(service, 'getService').mockImplementation(((name: string) => {
      const map: Record<string, unknown> = {
        surveyCompletionEmail: mockServiceSurveyCompletionEmail,
      }
      return map[name] ?? {}
    }) as typeof service.getService)
  })

  describe('getIdData', () => {
    test('prefers participantId when both are present', () => {
      const result = service.getIdData({
        participantId: 'p_1',
        sessionId: 's_1',
      })
      expect(result).toEqual({ participantId: 'p_1' })
    })

    test('falls back to sessionId when no participantId', () => {
      const result = service.getIdData({ sessionId: 's_1' })
      expect(result).toEqual({ sessionId: 's_1' })
    })

    test('neither present throws BadRequest', () => {
      expect(() => service.getIdData({})).toThrow()
    })
  })

  describe('save — new (incomplete, in-progress) response', () => {
    test('inserts a fresh response record without validating', async () => {
      mockRepoSurveyResponse.findOne.mockResolvedValue(null)

      const result = await service.save({
        response: { answers: { q1: 'a' }, completedAt: false },
        aclContext: baseAclContext(),
      })

      expect(mockRepoSurveyResponse.insertOne).toHaveBeenCalled()
      expect(result.completedAt).toBeNull()
      expect(result.surveyId).toBe('survey_1')
      expect(result.participantId).toBe('participant_1')
    })

    test('does not log a submission event for an incomplete save', async () => {
      mockRepoSurveyResponse.findOne.mockResolvedValue(null)

      await service.save({
        response: { answers: {}, completedAt: false },
        aclContext: baseAclContext(),
      })

      expect(mockEventLog.log).not.toHaveBeenCalled()
      expect(
        mockServiceSurveyCompletionEmail.sendCompletionEmails,
      ).not.toHaveBeenCalled()
    })

    test('does not record billing usage for an incomplete save', async () => {
      mockRepoSurveyResponse.findOne.mockResolvedValue(null)

      await service.save({
        response: { answers: {}, completedAt: false },
        aclContext: baseAclContext(),
      })

      expect(recordSpy).not.toHaveBeenCalled()
    })
  })

  describe('save — first-answer usage tracking', () => {
    test('sets startedAt and records usage the moment answers first becomes non-empty (insert)', async () => {
      mockRepoSurveyResponse.findOne.mockResolvedValue(null)

      const result = await service.save({
        response: { answers: { q1: 'a' }, completedAt: false },
        aclContext: baseAclContext(),
      })

      expect(result.startedAt).toBeInstanceOf(Date)
      expect(guardSpy).toHaveBeenCalledWith('proj_1')
      expect(recordSpy).toHaveBeenCalledWith('proj_1')
    })

    test('sets startedAt and records usage the moment answers first becomes non-empty (update of a previously-empty response)', async () => {
      mockRepoSurveyResponse.findOne.mockResolvedValue({
        completedAt: null,
        startedAt: null,
        randomSeeds: {},
      })

      const result = await service.save({
        response: { answers: { q1: 'a' }, completedAt: false },
        aclContext: baseAclContext(),
      })

      expect(result.startedAt).toBeInstanceOf(Date)
      expect(recordSpy).toHaveBeenCalledWith('proj_1')
    })

    test('does not re-check the limit or re-credit a later save of an already-started response', async () => {
      const priorStartedAt = new Date('2024-01-01')
      mockRepoSurveyResponse.findOne.mockResolvedValue({
        completedAt: null,
        startedAt: priorStartedAt,
        randomSeeds: {},
      })

      const result = await service.save({
        response: { answers: { q1: 'a', q2: 'b' }, completedAt: false },
        aclContext: baseAclContext(),
      })

      expect(result.startedAt).toEqual(priorStartedAt)
      expect(guardSpy).not.toHaveBeenCalled()
      expect(recordSpy).not.toHaveBeenCalled()
    })

    test('an empty-answer save (survey opened, no answer yet) leaves startedAt null and does not credit', async () => {
      mockRepoSurveyResponse.findOne.mockResolvedValue(null)

      const result = await service.save({
        response: { answers: {}, completedAt: false },
        aclContext: baseAclContext(),
      })

      expect(result.startedAt).toBeNull()
      expect(guardSpy).not.toHaveBeenCalled()
      expect(recordSpy).not.toHaveBeenCalled()
    })

    test('first-answer credit fires independently of completed/completedAt', async () => {
      mockRepoSurveyResponse.findOne.mockResolvedValue(null)

      await service.save({
        response: { answers: { q1: 'a' }, completedAt: false },
        aclContext: baseAclContext(),
      })

      expect(recordSpy).toHaveBeenCalledWith('proj_1')
      expect(mockEventLog.log).not.toHaveBeenCalled()
    })
  })

  describe('save — completing a response', () => {
    const snapshotWithQuestions = {
      survey: {
        elements: [
          {
            code: 'q1',
            type: 'text',
            attributes: { required: true },
          },
        ],
        sections: [],
        data: { timestamp: true },
      },
    }

    test('enforces the RESPONSES usage limit before anything else', async () => {
      guardSpy.mockRejectedValue(new Error('limit exceeded'))

      await expect(
        service.save({
          response: { answers: { q1: 'a' }, completedAt: true },
          aclContext: baseAclContext(),
        }),
      ).rejects.toThrow('limit exceeded')

      expect(mockRepoSurveyResponse.insertOne).not.toHaveBeenCalled()
      expect(mockRepoSurveyResponse.updateOne).not.toHaveBeenCalled()
    })

    test('invalid answers against the snapshot schema are rejected, nothing is persisted', async () => {
      mockRepoSurveySnapshot.findOne.mockResolvedValue(snapshotWithQuestions)
      mockRepoSurveyResponse.findOne.mockResolvedValue(null)

      await expect(
        service.save({
          response: { answers: {}, completedAt: true }, // missing required q1
          aclContext: baseAclContext(),
        }),
      ).rejects.toMatchObject({ ref: 'SURVEY_RESPONSE_VALIDATION' })

      expect(mockRepoSurveyResponse.insertOne).not.toHaveBeenCalled()
    })

    test('valid answers on a new response insert and log response.submitted', async () => {
      mockRepoSurveySnapshot.findOne.mockResolvedValue(snapshotWithQuestions)
      mockRepoSurveyResponse.findOne.mockResolvedValue(null)

      const result = await service.save({
        response: { answers: { q1: 'a' }, completedAt: true },
        aclContext: baseAclContext(),
      })

      expect(mockRepoSurveyResponse.insertOne).toHaveBeenCalled()
      expect(result.completed).toBe(true)
      expect(result.completedAt).toBeInstanceOf(Date)
      expect(recordSpy).toHaveBeenCalledWith('proj_1')
      expect(mockEventLog.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'response.submitted',
          projectId: 'proj_1',
        }),
      )
      expect(
        mockServiceSurveyCompletionEmail.sendCompletionEmails,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'proj_1',
          surveyId: 'survey_1',
          snapshotId: 'snapshot_1',
          participantId: 'participant_1',
        }),
      )
    })

    test('sending completion emails failing does not fail the submission', async () => {
      mockRepoSurveySnapshot.findOne.mockResolvedValue(snapshotWithQuestions)
      mockRepoSurveyResponse.findOne.mockResolvedValue(null)
      mockServiceSurveyCompletionEmail.sendCompletionEmails.mockRejectedValue(
        new Error('SMTP down'),
      )

      const result = await service.save({
        response: { answers: { q1: 'a' }, completedAt: true },
        aclContext: baseAclContext(),
      })

      expect(result.completed).toBe(true)
      expect(result.completedAt).toBeInstanceOf(Date)
    })

    test('re-submitting to an already-completed response is forbidden', async () => {
      mockRepoSurveySnapshot.findOne.mockResolvedValue(snapshotWithQuestions)
      mockRepoSurveyResponse.findOne.mockResolvedValue({
        completed: true,
        completedAt: new Date('2024-01-01'),
      })

      await expect(
        service.save({
          response: { answers: { q1: 'a' }, completedAt: true },
          aclContext: baseAclContext(),
        }),
      ).rejects.toMatchObject({ ref: 'SURVEY_COMPLETED' })

      expect(mockRepoSurveyResponse.updateOne).not.toHaveBeenCalled()
      expect(recordSpy).not.toHaveBeenCalled()
    })

    test('completing an existing in-progress response merges randomSeeds rather than overwriting', async () => {
      mockRepoSurveySnapshot.findOne.mockResolvedValue(snapshotWithQuestions)
      mockRepoSurveyResponse.findOne.mockResolvedValue({
        completedAt: null,
        randomSeeds: { groupA: 111 },
      })

      await service.save({
        response: {
          answers: { q1: 'a' },
          completedAt: true,
          randomSeeds: { groupB: 222 },
        },
        aclContext: baseAclContext(),
      })

      const updateArg = mockRepoSurveyResponse.updateOne.mock.calls[0][1]
      expect(updateArg.$set.randomSeeds).toEqual({
        groupA: 111,
        groupB: 222,
      })
      expect(recordSpy).toHaveBeenCalledWith('proj_1')
    })

    test('strips identifying fields from the update payload so they cannot be reassigned', async () => {
      mockRepoSurveySnapshot.findOne.mockResolvedValue(snapshotWithQuestions)
      mockRepoSurveyResponse.findOne.mockResolvedValue({ completedAt: null })

      await service.save({
        response: {
          answers: { q1: 'a' },
          completedAt: true,
          participantId: 'attacker-supplied-id',
        },
        aclContext: baseAclContext(),
      })

      const updateArg = mockRepoSurveyResponse.updateOne.mock.calls[0][1]
      expect(updateArg.$set.participantId).toBeUndefined()
    })

    test('refreshes publicationId on the existing response to the current aclContext value', async () => {
      mockRepoSurveySnapshot.findOne.mockResolvedValue(snapshotWithQuestions)
      mockRepoSurveyResponse.findOne.mockResolvedValue({
        completedAt: null,
        publicationId: 'stale-pub',
      })

      await service.save({
        response: { answers: { q1: 'a' }, completedAt: true },
        aclContext: baseAclContext(), // publicationId: 'pub_1'
      })

      const updateArg = mockRepoSurveyResponse.updateOne.mock.calls[0][1]
      expect(updateArg.$set.publicationId).toBe('pub_1')
    })
  })

  describe('save — completed / completedAt decoupling', () => {
    const snapshotWithTimestampSetting = (timestamp: boolean) => ({
      survey: {
        elements: [{ code: 'q1', type: 'text', attributes: {} }],
        sections: [],
        data: { timestamp },
      },
    })

    test('marks completed=true but leaves completedAt null when data.timestamp is disabled (insert)', async () => {
      mockRepoSurveySnapshot.findOne.mockResolvedValue(
        snapshotWithTimestampSetting(false),
      )
      mockRepoSurveyResponse.findOne.mockResolvedValue(null)

      const result = await service.save({
        response: { answers: { q1: 'a' }, completedAt: true },
        aclContext: baseAclContext(),
      })

      expect(result.completed).toBe(true)
      expect(result.completedAt).toBeNull()
    })

    test('marks completed=true but leaves completedAt null when data.timestamp is disabled (update)', async () => {
      mockRepoSurveySnapshot.findOne.mockResolvedValue(
        snapshotWithTimestampSetting(false),
      )
      mockRepoSurveyResponse.findOne.mockResolvedValue({
        completed: false,
        completedAt: null,
      })

      await service.save({
        response: { answers: { q1: 'a' }, completedAt: true },
        aclContext: baseAclContext(),
      })

      const updateArg = mockRepoSurveyResponse.updateOne.mock.calls[0][1]
      expect(updateArg.$set.completed).toBe(true)
      expect(updateArg.$set.completedAt).toBeNull()
    })

    test('still fires billing/eventLog/completion-email side effects when data.timestamp is disabled', async () => {
      mockRepoSurveySnapshot.findOne.mockResolvedValue(
        snapshotWithTimestampSetting(false),
      )
      mockRepoSurveyResponse.findOne.mockResolvedValue(null)

      await service.save({
        response: { answers: { q1: 'a' }, completedAt: true },
        aclContext: baseAclContext(),
      })

      expect(recordSpy).toHaveBeenCalledWith('proj_1')
      expect(mockEventLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'response.submitted' }),
      )
      expect(
        mockServiceSurveyCompletionEmail.sendCompletionEmails,
      ).toHaveBeenCalled()
    })

    test('blocks resubmission when the existing response is completed=true with a null completedAt', async () => {
      mockRepoSurveySnapshot.findOne.mockResolvedValue(
        snapshotWithTimestampSetting(false),
      )
      mockRepoSurveyResponse.findOne.mockResolvedValue({
        completed: true,
        completedAt: null,
      })

      await expect(
        service.save({
          response: { answers: { q1: 'a' }, completedAt: true },
          aclContext: baseAclContext(),
        }),
      ).rejects.toMatchObject({ ref: 'SURVEY_COMPLETED' })

      expect(mockRepoSurveyResponse.updateOne).not.toHaveBeenCalled()
      expect(recordSpy).not.toHaveBeenCalled()
    })
  })

  describe('save — ip / referrerUrl capture', () => {
    const snapshotWithDataSettings = (data: Record<string, boolean>) => ({
      survey: { data },
    })

    test('does not capture ip/referrerUrl when neither setting is enabled', async () => {
      mockRepoSurveySnapshot.findOne.mockResolvedValue(
        snapshotWithDataSettings({}),
      )
      mockRepoSurveyResponse.findOne.mockResolvedValue(null)

      const result = await service.save({
        response: { answers: {}, completedAt: false },
        aclContext: baseAclContext(),
        ip: '8.8.8.8',
        referrerUrl: 'https://example.com/landing',
      })

      expect(result.ip).toBeUndefined()
      expect(result.referrerUrl).toBeUndefined()
    })

    test('captures ip on insert when the setting is enabled', async () => {
      mockRepoSurveySnapshot.findOne.mockResolvedValue(
        snapshotWithDataSettings({ ip: true }),
      )
      mockRepoSurveyResponse.findOne.mockResolvedValue(null)

      const result = await service.save({
        response: { answers: {}, completedAt: false },
        aclContext: baseAclContext(),
        ip: '8.8.8.8',
      })

      expect(result.ip).toBe('8.8.8.8')
    })

    test('does not capture ip when the setting is disabled', async () => {
      mockRepoSurveySnapshot.findOne.mockResolvedValue(
        snapshotWithDataSettings({ ip: false }),
      )
      mockRepoSurveyResponse.findOne.mockResolvedValue(null)

      const result = await service.save({
        response: { answers: {}, completedAt: false },
        aclContext: baseAclContext(),
        ip: '8.8.8.8',
      })

      expect(result.ip).toBeUndefined()
    })

    test('truncates the ip before storing when anonymiseIp is also enabled', async () => {
      mockRepoSurveySnapshot.findOne.mockResolvedValue(
        snapshotWithDataSettings({ ip: true, anonymiseIp: true }),
      )
      mockRepoSurveyResponse.findOne.mockResolvedValue(null)

      const result = await service.save({
        response: { answers: {}, completedAt: false },
        aclContext: baseAclContext(),
        ip: '8.8.8.8',
      })

      expect(result.ip).toBe('8.8.8.0')
    })

    test('captures referrerUrl on insert when the setting is enabled', async () => {
      mockRepoSurveySnapshot.findOne.mockResolvedValue(
        snapshotWithDataSettings({ referrerUrl: true }),
      )
      mockRepoSurveyResponse.findOne.mockResolvedValue(null)

      const result = await service.save({
        response: { answers: {}, completedAt: false },
        aclContext: baseAclContext(),
        referrerUrl: 'https://example.com/landing',
      })

      expect(result.referrerUrl).toBe('https://example.com/landing')
    })

    test('does not overwrite ip/referrerUrl already stored on an existing response', async () => {
      mockRepoSurveyResponse.findOne.mockResolvedValue({
        completedAt: null,
        ip: '1.2.3.4',
        referrerUrl: 'https://original.example.com',
      })

      await service.save({
        response: { answers: { q1: 'a' }, completedAt: false },
        aclContext: baseAclContext(),
        ip: '9.9.9.9',
        referrerUrl: 'https://new.example.com',
      })

      const updateArg = mockRepoSurveyResponse.updateOne.mock.calls[0][1]
      expect(updateArg.$set.ip).toBeUndefined()
      expect(updateArg.$set.referrerUrl).toBeUndefined()
    })
  })

  describe('save — anonymous survey', () => {
    const ANON_SENTINEL = '1971-01-01T00:00:01.000Z'

    const anonAclContext = () => ({
      ...baseAclContext(),
      participantId: undefined,
      sessionId: 'session_anon_1',
    })

    const anonSnapshot = (data: Record<string, boolean> = {}) => ({
      survey: {
        elements: [{ code: 'q1', type: 'text', attributes: {} }],
        sections: [],
        access: { anonymous: true },
        data,
      },
    })

    test('insert: no participant id, sentinel timestamps, ip/referrer forced null', async () => {
      mockRepoSurveySnapshot.findOne.mockResolvedValue(
        anonSnapshot({ ip: true, referrerUrl: true, timestamp: true }),
      )
      mockRepoSurveyResponse.findOne.mockResolvedValue(null)

      const result = await service.save({
        response: { answers: { q1: 'a' }, completedAt: false },
        aclContext: anonAclContext(),
        ip: '8.8.8.8',
        referrerUrl: 'https://example.com',
      })

      expect(result.participantId).toBeNull()
      expect(result.sessionId).toBe('session_anon_1')
      expect(result.ip).toBeNull()
      expect(result.referrerUrl).toBeNull()
      expect(new Date(result.createdAt).toISOString()).toBe(ANON_SENTINEL)
      expect(new Date(result.updatedAt).toISOString()).toBe(ANON_SENTINEL)
      // first answer present → startedAt stamped with the sentinel
      expect(new Date(result.startedAt).toISOString()).toBe(ANON_SENTINEL)
      expect(result.completedAt).toBeNull()
    })

    test('completing: completedAt is the sentinel even when the timestamp setting is off', async () => {
      mockRepoSurveySnapshot.findOne.mockResolvedValue(
        anonSnapshot({ timestamp: false }),
      )
      mockRepoSurveyResponse.findOne.mockResolvedValue(null)

      const result = await service.save({
        response: { answers: { q1: 'a' }, completedAt: true },
        aclContext: anonAclContext(),
      })

      expect(result.completed).toBe(true)
      expect(new Date(result.completedAt).toISOString()).toBe(ANON_SENTINEL)
    })

    test('update: sentinel timestamps written into the $set payload', async () => {
      mockRepoSurveySnapshot.findOne.mockResolvedValue(
        anonSnapshot({ timestamp: true }),
      )
      mockRepoSurveyResponse.findOne.mockResolvedValue({
        completed: false,
        startedAt: new Date('2026-01-01T00:00:00.000Z'),
      })

      await service.save({
        response: { answers: { q1: 'a' }, completedAt: true },
        aclContext: anonAclContext(),
      })

      const set = mockRepoSurveyResponse.updateOne.mock.calls[0][1].$set
      expect(new Date(set.createdAt).toISOString()).toBe(ANON_SENTINEL)
      expect(new Date(set.updatedAt).toISOString()).toBe(ANON_SENTINEL)
      expect(new Date(set.completedAt).toISOString()).toBe(ANON_SENTINEL)
    })

    test('completion emails still run with a null participant id', async () => {
      mockRepoSurveySnapshot.findOne.mockResolvedValue(anonSnapshot())
      mockRepoSurveyResponse.findOne.mockResolvedValue(null)

      await expect(
        service.save({
          response: { answers: { q1: 'a' }, completedAt: true },
          aclContext: anonAclContext(),
        }),
      ).resolves.toBeDefined()

      expect(
        mockServiceSurveyCompletionEmail.sendCompletionEmails,
      ).toHaveBeenCalled()
    })
  })
})
