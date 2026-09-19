import { ServiceSurveyParticipant } from './ServiceSurveyParticipant'

const SURVEY_ID = 'survey-1'
const PROJECT_ID = 'project-1'
const PARTICIPANT_ID = 'participant-1'

const makeService = ({
  existingParticipant,
  suppressionRecord,
}: {
  existingParticipant?: Record<string, unknown>
  suppressionRecord?: Record<string, unknown> | null
} = {}) => {
  const service = new ServiceSurveyParticipant() as unknown as Omit<
    ServiceSurveyParticipant,
    'getRepo'
  > & { getRepo: jest.Mock }

  const repoSurveyParticipant = {
    create: jest.fn().mockResolvedValue(undefined),
    // Lookups by _id (the "load existing participant" query) return the
    // fixture; the email-uniqueness check queries by email with no _id (or
    // an $ne _id) and should find no conflicting participant by default.
    findOne: jest
      .fn()
      .mockImplementation(async (query: Record<string, unknown>) => {
        return query._id && typeof query._id !== 'object'
          ? (existingParticipant ?? null)
          : null
      }),
    find: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    updateOne: jest.fn().mockResolvedValue(undefined),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
  }
  const repoSurvey = {
    findOne: jest.fn().mockResolvedValue({ _id: SURVEY_ID }),
  }
  const repoSettingSurvey = {
    findOne: jest.fn().mockResolvedValue({}),
  }
  // Mimics the expiry-aware query semantics of findLiveSuppression:
  // { email, $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] }
  const repoEmailSuppression = {
    findOne: jest.fn().mockImplementation(async () => {
      if (!suppressionRecord) return null
      const expiresAt = suppressionRecord.expiresAt as Date | null
      const isActive = expiresAt === null || new Date(expiresAt) > new Date()
      return isActive ? suppressionRecord : null
    }),
  }
  const repoSurveyResponse = {
    find: jest.fn().mockResolvedValue([]),
  }
  const repoEmail = {
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
  }

  service.getRepo = jest.fn((name: string) => {
    if (name === 'surveyParticipant') return repoSurveyParticipant
    if (name === 'survey') return repoSurvey
    if (name === 'settingSurvey') return repoSettingSurvey
    if (name === 'emailSuppression') return repoEmailSuppression
    if (name === 'surveyResponse') return repoSurveyResponse
    if (name === 'email') return repoEmail
    throw new Error(`Unexpected repo: ${name}`)
  })

  return {
    service,
    repoSurveyParticipant,
    repoEmailSuppression,
    repoSurveyResponse,
    repoEmail,
  }
}

describe('ServiceSurveyParticipant.create', () => {
  test('generates an emailVerifyToken for a new participant', async () => {
    const { service, repoSurveyParticipant } = makeService()

    const result = await service.create({
      participant: {
        nameFirst: 'Jane',
        nameLast: 'Doe',
        email: 'jane@example.com',
        language: 'en',
        token: 'ABC123',
      },
      surveyId: SURVEY_ID,
      projectId: PROJECT_ID,
      aclContext: { jwt: { _id: 'user-1' } } as never,
    })

    expect(result.emailVerifyToken).toEqual(expect.any(String))
    expect(repoSurveyParticipant.create).toHaveBeenCalledTimes(1)
    const [createdParticipant] = repoSurveyParticipant.create.mock.calls[0]
    expect(createdParticipant.emailVerifyToken).toBe(result.emailVerifyToken)
  })

  test('strips a caller-supplied emailStatus so the schema default applies', async () => {
    const { service, repoSurveyParticipant } = makeService()

    await service.create({
      participant: {
        nameFirst: 'Jane',
        nameLast: 'Doe',
        email: 'jane@example.com',
        language: 'en',
        emailStatus: 'verified',
      } as never,
      surveyId: SURVEY_ID,
      projectId: PROJECT_ID,
      aclContext: { jwt: { _id: 'user-1' } } as never,
    })

    const [createdParticipant] = repoSurveyParticipant.create.mock.calls[0]
    expect(createdParticipant.emailStatus).toBe('pending')
  })
})

describe('ServiceSurveyParticipant.create — rejects a duplicate email up front', () => {
  test('throws a friendly error instead of hitting the unique index', async () => {
    const { service, repoSurveyParticipant } = makeService()
    repoSurveyParticipant.findOne.mockImplementation(
      async (query: Record<string, unknown>) =>
        query.email === 'jane@example.com'
          ? { _id: 'other-participant' }
          : null,
    )

    await expect(
      service.create({
        participant: {
          nameFirst: 'Jane',
          nameLast: 'Doe',
          email: 'jane@example.com',
          language: 'en',
        },
        surveyId: SURVEY_ID,
        projectId: PROJECT_ID,
        aclContext: { jwt: { _id: 'user-1' } } as never,
      }),
    ).rejects.toThrow(/already exists/)

    expect(repoSurveyParticipant.create).not.toHaveBeenCalled()
  })
})

describe('ServiceSurveyParticipant.update — email change triggers re-verification', () => {
  test('editing email resets emailStatus to pending and rotates emailVerifyToken', async () => {
    const { service, repoSurveyParticipant } = makeService({
      existingParticipant: {
        _id: PARTICIPANT_ID,
        email: 'old@example.com',
        emailStatus: 'verified',
        emailVerifyToken: 'old-token',
        token: 'ABC123',
      },
    })

    await service.update({
      participantId: PARTICIPANT_ID,
      surveyId: SURVEY_ID,
      projectId: PROJECT_ID,
      participant: {
        email: 'new@example.com',
        emailStatus: 'verified', // caller-supplied - must be stripped, never persisted verbatim
      },
    })

    expect(repoSurveyParticipant.updateOne).toHaveBeenCalledTimes(1)
    const [, updatePayload] = repoSurveyParticipant.updateOne.mock.calls[0]
    expect(updatePayload.$set.emailStatus).toBe('pending')
    expect(updatePayload.$set.emailVerifyToken).toEqual(expect.any(String))
    expect(updatePayload.$set.emailVerifyToken).not.toBe('old-token')
  })

  test('rejects a duplicate email instead of hitting the unique index', async () => {
    const { service, repoSurveyParticipant } = makeService({
      existingParticipant: {
        _id: PARTICIPANT_ID,
        email: 'old@example.com',
        emailStatus: 'verified',
        emailVerifyToken: 'old-token',
        token: 'ABC123',
      },
    })
    repoSurveyParticipant.findOne.mockImplementation(
      async (query: Record<string, unknown>) => {
        if (query._id && typeof query._id !== 'object') {
          return {
            _id: PARTICIPANT_ID,
            email: 'old@example.com',
            emailStatus: 'verified',
            emailVerifyToken: 'old-token',
            token: 'ABC123',
          }
        }
        return query.email === 'taken@example.com'
          ? { _id: 'other-participant' }
          : null
      },
    )

    await expect(
      service.update({
        participantId: PARTICIPANT_ID,
        surveyId: SURVEY_ID,
        projectId: PROJECT_ID,
        participant: { email: 'taken@example.com' },
      }),
    ).rejects.toThrow(/already exists/)

    expect(repoSurveyParticipant.updateOne).not.toHaveBeenCalled()
  })

  test('leaving email unchanged does not touch emailStatus or emailVerifyToken', async () => {
    const { service, repoSurveyParticipant } = makeService({
      existingParticipant: {
        _id: PARTICIPANT_ID,
        email: 'same@example.com',
        emailStatus: 'verified',
        emailVerifyToken: 'existing-token',
        token: 'ABC123',
      },
    })

    await service.update({
      participantId: PARTICIPANT_ID,
      surveyId: SURVEY_ID,
      projectId: PROJECT_ID,
      participant: {
        email: 'same@example.com',
        nameFirst: 'Updated',
      },
    })

    const [, updatePayload] = repoSurveyParticipant.updateOne.mock.calls[0]
    expect(updatePayload.$set.emailStatus).toBeUndefined()
    expect(updatePayload.$set.emailVerifyToken).toBeUndefined()
  })

  test('a caller-supplied emailVerifyToken is always stripped before persisting', async () => {
    const { service, repoSurveyParticipant } = makeService({
      existingParticipant: {
        _id: PARTICIPANT_ID,
        email: 'same@example.com',
        emailStatus: 'pending',
        emailVerifyToken: 'existing-token',
        token: 'ABC123',
      },
    })

    await service.update({
      participantId: PARTICIPANT_ID,
      surveyId: SURVEY_ID,
      projectId: PROJECT_ID,
      participant: {
        email: 'same@example.com',
        emailVerifyToken: 'attacker-supplied',
      } as never,
    })

    const [, updatePayload] = repoSurveyParticipant.updateOne.mock.calls[0]
    expect(updatePayload.$set.emailVerifyToken).not.toBe('attacker-supplied')
  })
})

describe('ServiceSurveyParticipant.update — coerces emailStatus against live suppression', () => {
  test('a live hardBounce suppression forces emailStatus to invalid', async () => {
    const { service, repoSurveyParticipant } = makeService({
      existingParticipant: {
        _id: PARTICIPANT_ID,
        email: 'jane@example.com',
        emailStatus: 'invalid',
        token: 'ABC123',
      },
      suppressionRecord: {
        email: 'jane@example.com',
        reason: 'hardBounce',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    })

    await service.update({
      participantId: PARTICIPANT_ID,
      surveyId: SURVEY_ID,
      projectId: PROJECT_ID,
      // Unchanged email is enough to trigger the suppression check without
      // being treated as an email change - emailStatus can no longer be
      // caller-supplied, so it is never part of this payload.
      participant: { email: 'jane@example.com' },
    })

    const [, updatePayload] = repoSurveyParticipant.updateOne.mock.calls[0]
    expect(updatePayload.$set.emailStatus).toBe('invalid')
    expect(updatePayload.$set.bounceType).toBe('hardBounce')
  })

  test('a live complaint suppression forces emailStatus to invalid and sets complaintAt', async () => {
    const { service, repoSurveyParticipant } = makeService({
      existingParticipant: {
        _id: PARTICIPANT_ID,
        email: 'jane@example.com',
        emailStatus: 'invalid',
        token: 'ABC123',
      },
      suppressionRecord: {
        email: 'jane@example.com',
        reason: 'complaint',
        expiresAt: null,
      },
    })

    await service.update({
      participantId: PARTICIPANT_ID,
      surveyId: SURVEY_ID,
      projectId: PROJECT_ID,
      participant: { email: 'jane@example.com' },
    })

    const [, updatePayload] = repoSurveyParticipant.updateOne.mock.calls[0]
    expect(updatePayload.$set.emailStatus).toBe('invalid')
    expect(updatePayload.$set.complaintAt).toEqual(expect.any(Date))
  })

  test('a live softBounce-only suppression does not force emailStatus to invalid', async () => {
    const { service, repoSurveyParticipant } = makeService({
      existingParticipant: {
        _id: PARTICIPANT_ID,
        email: 'jane@example.com',
        emailStatus: 'invalid',
        token: 'ABC123',
      },
      suppressionRecord: {
        email: 'jane@example.com',
        reason: 'softBounce',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    })

    await service.update({
      participantId: PARTICIPANT_ID,
      surveyId: SURVEY_ID,
      projectId: PROJECT_ID,
      participant: { email: 'jane@example.com' },
    })

    const [, updatePayload] = repoSurveyParticipant.updateOne.mock.calls[0]
    expect(updatePayload.$set.emailStatus).toBeUndefined()
  })

  test('no suppression, or an expired one, leaves emailStatus untouched', async () => {
    const { service, repoSurveyParticipant } = makeService({
      existingParticipant: {
        _id: PARTICIPANT_ID,
        email: 'jane@example.com',
        emailStatus: 'invalid',
        token: 'ABC123',
      },
      suppressionRecord: {
        email: 'jane@example.com',
        reason: 'hardBounce',
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // expired
      },
    })

    await service.update({
      participantId: PARTICIPANT_ID,
      surveyId: SURVEY_ID,
      projectId: PROJECT_ID,
      participant: { email: 'jane@example.com' },
    })

    const [, updatePayload] = repoSurveyParticipant.updateOne.mock.calls[0]
    expect(updatePayload.$set.emailStatus).toBeUndefined()
  })

  test('a caller-supplied emailStatus alone is stripped and never looks up suppression', async () => {
    const { service, repoSurveyParticipant, repoEmailSuppression } =
      makeService({
        existingParticipant: {
          _id: PARTICIPANT_ID,
          email: 'jane@example.com',
          emailStatus: 'invalid',
          token: 'ABC123',
        },
      })

    await service.update({
      participantId: PARTICIPANT_ID,
      surveyId: SURVEY_ID,
      projectId: PROJECT_ID,
      participant: { emailStatus: 'verified' } as never,
    })

    expect(repoEmailSuppression.findOne).not.toHaveBeenCalled()
    const [, updatePayload] = repoSurveyParticipant.updateOne.mock.calls[0]
    expect(updatePayload.$set).not.toHaveProperty('emailStatus')
  })

  test('an update touching only an unrelated field never looks up suppression', async () => {
    const { service, repoEmailSuppression } = makeService({
      existingParticipant: {
        _id: PARTICIPANT_ID,
        email: 'jane@example.com',
        emailStatus: 'invalid',
        token: 'ABC123',
      },
    })

    await service.update({
      participantId: PARTICIPANT_ID,
      surveyId: SURVEY_ID,
      projectId: PROJECT_ID,
      participant: { nameFirst: 'Updated' },
    })

    expect(repoEmailSuppression.findOne).not.toHaveBeenCalled()
  })
})

describe('ServiceSurveyParticipant.getOne / getAll — never expose emailVerifyToken', () => {
  test('getOne strips emailVerifyToken from the result', async () => {
    const { service, repoSurveyParticipant } = makeService()
    repoSurveyParticipant.findOne.mockResolvedValue({
      _id: PARTICIPANT_ID,
      email: 'jane@example.com',
      token: 'ABC123',
      emailVerifyToken: 'super-secret',
    })

    const result = await service.getOne({
      participantId: PARTICIPANT_ID,
      surveyId: SURVEY_ID,
      projectId: PROJECT_ID,
      aclConditions: { projectAdmin: [PROJECT_ID] } as never,
    })

    expect(result).not.toHaveProperty('emailVerifyToken')
  })

  test('getAll strips emailVerifyToken from every participant in the result', async () => {
    const { service, repoSurveyParticipant } = makeService()
    repoSurveyParticipant.find.mockResolvedValue([
      {
        _id: PARTICIPANT_ID,
        email: 'jane@example.com',
        token: 'ABC123',
        emailVerifyToken: 'super-secret',
      },
    ])

    const result = await service.getAll({
      surveyId: SURVEY_ID,
      projectId: PROJECT_ID,
      page: 1,
      perPage: 10,
    })

    expect(result.participants[0]).not.toHaveProperty('emailVerifyToken')
  })
})

describe('ServiceSurveyParticipant.getAll — completionStatus filter', () => {
  test('completed status queries responses with completed:true and filters participants by $in', async () => {
    const { service, repoSurveyParticipant, repoSurveyResponse } = makeService()
    repoSurveyResponse.find.mockResolvedValue([
      { participantId: 'participant-1' },
      { participantId: 'participant-2' },
    ])

    await service.getAll({
      surveyId: SURVEY_ID,
      projectId: PROJECT_ID,
      page: 1,
      perPage: 10,
      completionStatus: 'completed',
    })

    const [responseQuery] = repoSurveyResponse.find.mock.calls[0]
    expect(responseQuery).toEqual({
      surveyId: SURVEY_ID,
      completed: true,
    })

    const [participantQuery] = repoSurveyParticipant.find.mock.calls[0]
    expect(participantQuery._id).toEqual({
      $in: ['participant-1', 'participant-2'],
    })
  })

  test('inProgress status queries responses with completed:false', async () => {
    const { service, repoSurveyResponse } = makeService()
    repoSurveyResponse.find.mockResolvedValue([
      { participantId: 'participant-3' },
    ])

    await service.getAll({
      surveyId: SURVEY_ID,
      projectId: PROJECT_ID,
      page: 1,
      perPage: 10,
      completionStatus: 'inProgress',
    })

    const [responseQuery] = repoSurveyResponse.find.mock.calls[0]
    expect(responseQuery).toEqual({
      surveyId: SURVEY_ID,
      completed: false,
    })
  })

  test('notStarted status excludes participants with any response via $nin', async () => {
    const { service, repoSurveyParticipant, repoSurveyResponse } = makeService()
    repoSurveyResponse.find.mockResolvedValue([
      { participantId: 'participant-1' },
    ])

    await service.getAll({
      surveyId: SURVEY_ID,
      projectId: PROJECT_ID,
      page: 1,
      perPage: 10,
      completionStatus: 'notStarted',
    })

    const [responseQuery] = repoSurveyResponse.find.mock.calls[0]
    expect(responseQuery).toEqual({
      surveyId: SURVEY_ID,
    })

    const [participantQuery] = repoSurveyParticipant.find.mock.calls[0]
    expect(participantQuery._id).toEqual({ $nin: ['participant-1'] })
  })

  test('short-circuits without querying participants when no responses match', async () => {
    const { service, repoSurveyParticipant, repoSurveyResponse } = makeService()
    repoSurveyResponse.find.mockResolvedValue([])

    const result = await service.getAll({
      surveyId: SURVEY_ID,
      projectId: PROJECT_ID,
      page: 1,
      perPage: 10,
      completionStatus: 'completed',
    })

    expect(result).toEqual({ participants: [], participantCount: 0 })
    expect(repoSurveyParticipant.find).not.toHaveBeenCalled()
    expect(repoSurveyParticipant.count).not.toHaveBeenCalled()
  })

  test('rejects an invalid completionStatus value', async () => {
    const { service } = makeService()

    await expect(
      service.getAll({
        surveyId: SURVEY_ID,
        projectId: PROJECT_ID,
        page: 1,
        perPage: 10,
        completionStatus: 'bogus' as never,
      }),
    ).rejects.toThrow()
  })
})

describe('ServiceSurveyParticipant.resetInviteStatus / resetReminderStatus', () => {
  test('resetInviteStatus nulls inviteSentAt and inviteQueuedAt, leaving bounce/complaint fields untouched', async () => {
    const { service, repoSurveyParticipant } = makeService()

    const result = await service.resetInviteStatus({
      participantId: PARTICIPANT_ID,
      surveyId: SURVEY_ID,
      projectId: PROJECT_ID,
      aclConditions: { projectAdmin: [PROJECT_ID] } as never,
    })

    expect(repoSurveyParticipant.updateMany).toHaveBeenCalledTimes(1)
    const [query, update] = repoSurveyParticipant.updateMany.mock.calls[0]
    expect(query).toEqual({
      _id: { $in: [PARTICIPANT_ID] },
      surveyId: SURVEY_ID,
    })
    expect(update.$set.inviteSentAt).toBeNull()
    expect(update.$set.inviteQueuedAt).toBeNull()
    expect(update.$set).not.toHaveProperty('reminderSentAt')
    expect(update.$set).not.toHaveProperty('reminderQueuedAt')
    expect(update.$set).not.toHaveProperty('bounceType')
    expect(update.$set).not.toHaveProperty('bounceAt')
    expect(update.$set).not.toHaveProperty('complaintAt')
    expect(update.$set).not.toHaveProperty('emailStatus')
    expect(result).toEqual({ updatedCount: 1 })
  })

  test('resetInviteStatus de-queues any still-pending invite RepoEmail rows for the participant, to prevent a duplicate send once re-triggered', async () => {
    const { service, repoEmail } = makeService()

    await service.resetInviteStatus({
      participantId: PARTICIPANT_ID,
      surveyId: SURVEY_ID,
      projectId: PROJECT_ID,
      aclConditions: { projectAdmin: [PROJECT_ID] } as never,
    })

    expect(repoEmail.deleteMany).toHaveBeenCalledWith({
      'data.participantId': { $in: [PARTICIPANT_ID] },
      type: 'invite',
      status: 'pending',
    })
  })

  test('resetReminderStatus nulls reminderSentAt and reminderQueuedAt', async () => {
    const { service, repoSurveyParticipant } = makeService()

    await service.resetReminderStatus({
      participantId: PARTICIPANT_ID,
      surveyId: SURVEY_ID,
      projectId: PROJECT_ID,
      aclConditions: { projectAdmin: [PROJECT_ID] } as never,
    })

    const [, update] = repoSurveyParticipant.updateMany.mock.calls[0]
    expect(update.$set.reminderSentAt).toBeNull()
    expect(update.$set.reminderQueuedAt).toBeNull()
    expect(update.$set).not.toHaveProperty('inviteSentAt')
    expect(update.$set).not.toHaveProperty('inviteQueuedAt')
  })

  test('resetReminderStatus de-queues only pending reminder rows, not invite rows', async () => {
    const { service, repoEmail } = makeService()

    await service.resetReminderStatus({
      participantId: PARTICIPANT_ID,
      surveyId: SURVEY_ID,
      projectId: PROJECT_ID,
      aclConditions: { projectAdmin: [PROJECT_ID] } as never,
    })

    expect(repoEmail.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'reminder', status: 'pending' }),
    )
  })

  test('supports comma-separated IDs for bulk reset', async () => {
    const { service, repoSurveyParticipant, repoEmail } = makeService()

    await service.resetInviteStatus({
      participantId: 'participant-1, participant-2',
      surveyId: SURVEY_ID,
      projectId: PROJECT_ID,
      aclConditions: { projectAdmin: [PROJECT_ID] } as never,
    })

    const [query] = repoSurveyParticipant.updateMany.mock.calls[0]
    expect(query._id.$in).toEqual(['participant-1', 'participant-2'])
    expect(repoEmail.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        'data.participantId': { $in: ['participant-1', 'participant-2'] },
      }),
    )
  })
})
