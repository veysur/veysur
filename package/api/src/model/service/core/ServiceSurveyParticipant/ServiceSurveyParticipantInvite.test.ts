// cspell:ignore Bonjour
import { ServiceSurveyParticipantEmail } from './ServiceSurveyParticipantInvite'

const SURVEY_ID = 'survey-1'
const PROJECT_ID = 'project-1'
const PARTICIPANT_ID = 'participant-1'

const makeService = ({
  emailVerifyToken,
  participantOverrides,
  suppressionRecord,
  respondedParticipants = [],
}: {
  emailVerifyToken?: string | null
  participantOverrides?: Record<string, unknown>
  suppressionRecord?: Record<string, unknown> | null
  respondedParticipants?: Array<{
    participantId: string
    completed?: boolean
    completedAt?: Date | null
  }>
} = {}) => {
  const service = new ServiceSurveyParticipantEmail() as unknown as Omit<
    ServiceSurveyParticipantEmail,
    'getRepo' | 'getService' | 'config'
  > & {
    getRepo: jest.Mock
    getService: jest.Mock
    config: unknown
  }

  const participant = {
    _id: PARTICIPANT_ID,
    email: 'jane@example.com',
    nameFirst: 'Jane',
    nameLast: 'Doe',
    token: 'ABC123',
    emailVerifyToken,
    bounceType: null,
    bounceAt: null,
    complaintAt: null,
    emailStatus: 'pending',
    inviteSentAt: null,
    ...participantOverrides,
  }

  const repoSurveyParticipant = {
    count: jest.fn().mockResolvedValue(1),
    find: jest.fn().mockResolvedValue([participant]),
    updateOne: jest.fn().mockResolvedValue(undefined),
  }
  const repoSurvey = {
    findOne: jest.fn().mockResolvedValue({ _id: SURVEY_ID, name: 'My Survey' }),
  }
  const serviceProject = {
    getById: jest.fn().mockResolvedValue({
      _id: PROJECT_ID,
      name: 'Project',
      ownerId: 'owner-1',
    }),
  }
  // Mimics the send-gate's expiry-aware query semantics:
  // { email, $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] }
  const repoEmailSuppression = {
    findOne: jest.fn().mockImplementation(async () => {
      if (!suppressionRecord) return null
      const expiresAt = suppressionRecord.expiresAt as Date | null
      const isActive = expiresAt === null || new Date(expiresAt) > new Date()
      return isActive ? suppressionRecord : null
    }),
    updateOne: jest.fn().mockResolvedValue(undefined),
  }
  const repoSurveyResponse = {
    find: jest
      .fn()
      .mockImplementation(async (query: Record<string, unknown>) => {
        const list = query?.$or
          ? respondedParticipants.filter(
              (r) => !!r.completed || (r.completedAt ?? null) !== null,
            )
          : respondedParticipants
        return list.map((r) => ({ participantId: r.participantId }))
      }),
  }

  const serviceEmailTemplate = {
    getResolved: jest.fn().mockResolvedValue({
      subject: 'Invite: {{survey.name}}',
      body: 'Hello {{participant.nameFirst}}, click {{survey.link}}',
    }),
  }
  const serviceEmail = {
    enqueue: jest.fn().mockImplementation(async (record, scheduledAt) => {
      record.status = 'pending'
      record.scheduledAt = scheduledAt
      return record
    }),
  }

  service.getRepo = jest.fn((name: string) => {
    if (name === 'surveyParticipant') return repoSurveyParticipant
    if (name === 'survey') return repoSurvey
    if (name === 'emailSuppression') return repoEmailSuppression
    if (name === 'surveyResponse') return repoSurveyResponse
    throw new Error(`Unexpected repo: ${name}`)
  })

  service.getService = jest.fn((name: string) => {
    if (name === 'email') return serviceEmail
    if (name === 'emailTemplate') return serviceEmailTemplate
    if (name === 'project') return serviceProject
    throw new Error(`Unexpected service: ${name}`)
  })

  service.config = {
    model: {
      app: {
        companyName: 'Veysur',
        webDomain: 'veysur.local',
        mail: { bounceAddress: null },
      },
    },
  }

  return {
    service,
    repoSurveyParticipant,
    repoEmailSuppression,
    repoSurveyResponse,
    serviceEmail,
    serviceProject,
  }
}

describe('ServiceSurveyParticipantEmail.send — participant lookup query shape', () => {
  beforeEach(() => {
    jest.useRealTimers()
  })

  afterEach(() => {
    jest.useFakeTimers()
  })

  test('count/find queries do not filter on the removed projectId field', async () => {
    const { service, repoSurveyParticipant } = makeService({})

    await service.send({ surveyId: SURVEY_ID, projectId: PROJECT_ID })

    const expectedQuery = {
      surveyId: SURVEY_ID,
      email: { $ne: null },
      inviteSentAt: null,
      $or: [{ inviteQueuedAt: null }, { inviteQueuedAt: { $exists: false } }],
    }
    expect(repoSurveyParticipant.count).toHaveBeenCalledWith(
      expectedQuery,
      expect.anything(),
    )
    expect(repoSurveyParticipant.find).toHaveBeenCalledWith(
      expectedQuery,
      expect.anything(),
    )
  })
})

describe('ServiceSurveyParticipantEmail.send — emailVerifyToken in invite link', () => {
  // The send loop awaits a real setTimeout delay between participants -
  // fake timers (enabled globally in this project's jest config) never
  // advance it, so use real timers for this suite.
  beforeEach(() => {
    jest.useRealTimers()
  })

  afterEach(() => {
    jest.useFakeTimers()
  })

  test('reads the pre-existing emailVerifyToken and appends it as ?evt= on the survey link', async () => {
    const { service, serviceEmail, repoSurveyParticipant } = makeService({
      emailVerifyToken: 'pre-existing-token',
    })

    await service.send({ surveyId: SURVEY_ID, projectId: PROJECT_ID })

    expect(serviceEmail.enqueue).toHaveBeenCalledTimes(1)
    const [emailRecord] = serviceEmail.enqueue.mock.calls[0]
    expect(emailRecord.html).toContain(
      `https://veysur.local/survey/${SURVEY_ID}/ABC123?evt=pre-existing-token`,
    )
    // No fallback generation needed - the participant already had a token
    expect(repoSurveyParticipant.updateOne).not.toHaveBeenCalledWith(
      { _id: PARTICIPANT_ID },
      expect.objectContaining({
        $set: expect.objectContaining({ emailVerifyToken: expect.anything() }),
      }),
      expect.anything(),
    )
  })

  test('defensive fallback: generates and persists a token when the participant is missing one', async () => {
    const { service, serviceEmail, repoSurveyParticipant } = makeService({
      emailVerifyToken: null,
    })

    await service.send({ surveyId: SURVEY_ID, projectId: PROJECT_ID })

    expect(repoSurveyParticipant.updateOne).toHaveBeenCalledWith(
      { _id: PARTICIPANT_ID },
      { $set: { emailVerifyToken: expect.any(String) } },
      expect.anything(),
    )

    const [emailRecord] = serviceEmail.enqueue.mock.calls[0]
    expect(emailRecord.html).toMatch(
      new RegExp(`survey/${SURVEY_ID}/ABC123\\?evt=.+`),
    )
  })
})

describe('ServiceSurveyParticipantEmail.send — suppression expiry and cache reset', () => {
  beforeEach(() => {
    jest.useRealTimers()
  })

  afterEach(() => {
    jest.useFakeTimers()
  })

  test('an expired suppression record no longer blocks sending', async () => {
    const { service, serviceEmail } = makeService({
      suppressionRecord: {
        email: 'jane@example.com',
        reason: 'hardBounce',
        expiresAt: new Date(Date.now() - 1000),
      },
    })

    const result = await service.send({
      surveyId: SURVEY_ID,
      projectId: PROJECT_ID,
    })

    expect(serviceEmail.enqueue).toHaveBeenCalledTimes(1)
    expect(result.queued).toBe(1)
  })

  test('a suppression record with expiresAt null (complaint/unsubscribe) still blocks unconditionally', async () => {
    const { service, serviceEmail, repoSurveyParticipant } = makeService({
      suppressionRecord: {
        email: 'jane@example.com',
        reason: 'complaint',
        expiresAt: null,
      },
    })
    ;(repoSurveyParticipant.updateOne as jest.Mock).mockClear()

    const result = await service.send({
      surveyId: SURVEY_ID,
      projectId: PROJECT_ID,
    })

    expect(serviceEmail.enqueue).not.toHaveBeenCalled()
    expect(result.errors).toBe(1)
  })

  test('the removed bounceType fast-path no longer independently blocks a send once suppression has expired', async () => {
    const { service, serviceEmail } = makeService({
      participantOverrides: { bounceType: 'hardBounce' },
      suppressionRecord: null,
    })

    const result = await service.send({
      surveyId: SURVEY_ID,
      projectId: PROJECT_ID,
    })

    expect(serviceEmail.enqueue).toHaveBeenCalledTimes(1)
    expect(result.queued).toBe(1)
  })

  test('a successful send after expiry resets the participant cached bounce/complaint fields', async () => {
    const { service, repoSurveyParticipant, repoEmailSuppression } =
      makeService({
        participantOverrides: {
          bounceType: 'hardBounce',
          bounceAt: new Date(),
          complaintAt: new Date(),
          emailStatus: 'invalid',
        },
        suppressionRecord: null,
      })

    await service.send({ surveyId: SURVEY_ID, projectId: PROJECT_ID })

    expect(repoSurveyParticipant.updateOne).toHaveBeenCalledWith(
      { _id: PARTICIPANT_ID },
      expect.objectContaining({
        $set: expect.objectContaining({
          emailStatus: 'pending',
          bounceType: null,
          bounceAt: null,
          complaintAt: null,
        }),
      }),
      expect.anything(),
    )
    expect(repoEmailSuppression.updateOne).toHaveBeenCalledWith(
      { email: 'jane@example.com' },
      { $set: { softBounceEvents: [] } },
    )
  })

  test('a successful send resets the cache for a participant whose only history is a soft bounce', async () => {
    const { service, repoSurveyParticipant, repoEmailSuppression } =
      makeService({
        participantOverrides: {
          bounceType: 'softBounce',
          bounceAt: new Date(),
          emailStatus: 'pending',
        },
        suppressionRecord: null,
      })

    await service.send({ surveyId: SURVEY_ID, projectId: PROJECT_ID })

    expect(repoSurveyParticipant.updateOne).toHaveBeenCalledWith(
      { _id: PARTICIPANT_ID },
      expect.objectContaining({
        $set: expect.objectContaining({
          emailStatus: 'pending',
          bounceType: null,
          bounceAt: null,
          complaintAt: null,
        }),
      }),
      expect.anything(),
    )
    expect(repoEmailSuppression.updateOne).toHaveBeenCalledWith(
      { email: 'jane@example.com' },
      { $set: { softBounceEvents: [] } },
    )
  })

  test('queries emailSuppression via the shared findLiveSuppression expiry filter', async () => {
    const { service, repoEmailSuppression } = makeService()

    await service.send({ surveyId: SURVEY_ID, projectId: PROJECT_ID })

    expect(repoEmailSuppression.findOne).toHaveBeenCalledWith({
      email: 'jane@example.com',
      $or: [{ expiresAt: null }, { expiresAt: { $gt: expect.any(Date) } }],
    })
  })

  test('a successful send with no stale cache does not add bounce/complaint fields to the update', async () => {
    const { service, repoSurveyParticipant, repoEmailSuppression } =
      makeService({
        suppressionRecord: null,
      })

    await service.send({ surveyId: SURVEY_ID, projectId: PROJECT_ID })

    expect(repoEmailSuppression.updateOne).not.toHaveBeenCalled()

    const [, updateArgs] = (repoSurveyParticipant.updateOne as jest.Mock).mock
      .calls[0]
    expect(updateArgs.$set).not.toHaveProperty('bounceType')
    expect(updateArgs.$set).not.toHaveProperty('emailStatus')
  })
})

describe('ServiceSurveyParticipantEmail — excludes participants who already have a response', () => {
  beforeEach(() => {
    jest.useRealTimers()
  })

  afterEach(() => {
    jest.useFakeTimers()
  })

  test("send (invite) excludes the participant's _id from the query when they already have a response, even an incomplete one", async () => {
    const { service, repoSurveyParticipant } = makeService({
      respondedParticipants: [
        { participantId: PARTICIPANT_ID, completedAt: null },
      ],
    })

    await service.send({ surveyId: SURVEY_ID, projectId: PROJECT_ID })

    expect(repoSurveyParticipant.count).toHaveBeenCalledWith(
      expect.objectContaining({ _id: { $nin: [PARTICIPANT_ID] } }),
      expect.anything(),
    )
    expect(repoSurveyParticipant.find).toHaveBeenCalledWith(
      expect.objectContaining({ _id: { $nin: [PARTICIPANT_ID] } }),
      expect.anything(),
    )
  })

  test("sendReminders excludes the participant's _id from the query when they have a completed response", async () => {
    const { service, repoSurveyParticipant } = makeService({
      respondedParticipants: [
        { participantId: PARTICIPANT_ID, completedAt: new Date() },
      ],
    })

    await service.sendReminders({ surveyId: SURVEY_ID, projectId: PROJECT_ID })

    expect(repoSurveyParticipant.count).toHaveBeenCalledWith(
      expect.objectContaining({ _id: { $nin: [PARTICIPANT_ID] } }),
      expect.anything(),
    )
    expect(repoSurveyParticipant.find).toHaveBeenCalledWith(
      expect.objectContaining({ _id: { $nin: [PARTICIPANT_ID] } }),
      expect.anything(),
    )
  })

  test('sendReminders excludes a completed=true response even when completedAt is null (timestamp setting off)', async () => {
    const { service, repoSurveyParticipant } = makeService({
      respondedParticipants: [
        { participantId: PARTICIPANT_ID, completed: true, completedAt: null },
      ],
    })

    await service.sendReminders({ surveyId: SURVEY_ID, projectId: PROJECT_ID })

    expect(repoSurveyParticipant.find).toHaveBeenCalledWith(
      expect.objectContaining({ _id: { $nin: [PARTICIPANT_ID] } }),
      expect.anything(),
    )
  })

  test('sendReminders does NOT exclude a participant whose response is incomplete (started but not finished)', async () => {
    const { service, repoSurveyParticipant } = makeService({
      respondedParticipants: [
        { participantId: PARTICIPANT_ID, completedAt: null },
      ],
    })

    await service.sendReminders({ surveyId: SURVEY_ID, projectId: PROJECT_ID })

    const [query] = (repoSurveyParticipant.find as jest.Mock).mock.calls[0]
    expect(query).not.toHaveProperty('_id')
  })

  test('no response records present leaves the query unchanged (no _id filter added)', async () => {
    const { service, repoSurveyParticipant } = makeService()

    await service.send({ surveyId: SURVEY_ID, projectId: PROJECT_ID })

    const [query] = (repoSurveyParticipant.find as jest.Mock).mock.calls[0]
    expect(query).not.toHaveProperty('_id')
  })
})

describe('ServiceSurveyParticipantEmail.send — per-participant language template resolution', () => {
  beforeEach(() => {
    jest.useRealTimers()
  })

  afterEach(() => {
    jest.useFakeTimers()
  })

  const makeMultiLangService = (
    participants: Array<Record<string, unknown>>,
  ) => {
    const service = new ServiceSurveyParticipantEmail() as unknown as Omit<
      ServiceSurveyParticipantEmail,
      'getRepo' | 'getService' | 'config'
    > & {
      getRepo: jest.Mock
      getService: jest.Mock
      config: unknown
    }

    const repoSurveyParticipant = {
      count: jest.fn().mockResolvedValue(participants.length),
      find: jest.fn().mockResolvedValue(participants),
      updateOne: jest.fn().mockResolvedValue(undefined),
    }
    const repoSurvey = {
      findOne: jest
        .fn()
        .mockResolvedValue({ _id: SURVEY_ID, name: 'My Survey' }),
    }
    const serviceProject = {
      getById: jest.fn().mockResolvedValue({
        _id: PROJECT_ID,
        name: 'Project',
        ownerId: 'owner-1',
      }),
    }
    const repoEmailSuppression = {
      findOne: jest.fn().mockResolvedValue(null),
      updateOne: jest.fn().mockResolvedValue(undefined),
    }
    const repoSurveyResponse = {
      find: jest.fn().mockResolvedValue([]),
    }

    const templatesByLang: Record<string, { subject: string; body: string }> = {
      en: { subject: 'Invite EN', body: 'Hello EN {{participant.nameFirst}}' },
      fr: {
        subject: 'Invite FR',
        body: 'Bonjour FR {{participant.nameFirst}}',
      },
    }
    const getResolved = jest.fn(async ({ lang }: { lang: string }) => {
      return templatesByLang[lang] ?? null
    })
    const serviceEmailTemplate = { getResolved }
    const serviceEmail = {
      enqueue: jest.fn().mockImplementation(async (record, scheduledAt) => {
        record.status = 'pending'
        record.scheduledAt = scheduledAt
        return record
      }),
    }

    service.getRepo = jest.fn((name: string) => {
      if (name === 'surveyParticipant') return repoSurveyParticipant
      if (name === 'survey') return repoSurvey
      if (name === 'emailSuppression') return repoEmailSuppression
      if (name === 'surveyResponse') return repoSurveyResponse
      throw new Error(`Unexpected repo: ${name}`)
    })

    service.getService = jest.fn((name: string) => {
      if (name === 'email') return serviceEmail
      if (name === 'emailTemplate') return serviceEmailTemplate
      if (name === 'project') return serviceProject
      throw new Error(`Unexpected service: ${name}`)
    })

    service.config = {
      model: {
        app: {
          companyName: 'Veysur',
          webDomain: 'veysur.local',
          mail: { bounceAddress: null },
        },
      },
    }

    return { service, serviceEmail, getResolved }
  }

  test('each participant receives the template matching their own language', async () => {
    const participants = [
      {
        _id: 'p-en',
        email: 'en@example.com',
        nameFirst: 'Ann',
        token: 'TOK-EN',
        emailVerifyToken: 'evt-en',
        language: 'en',
        bounceType: null,
        bounceAt: null,
        complaintAt: null,
        emailStatus: 'pending',
        inviteSentAt: null,
      },
      {
        _id: 'p-fr',
        email: 'fr@example.com',
        nameFirst: 'Bernard',
        token: 'TOK-FR',
        emailVerifyToken: 'evt-fr',
        language: 'fr',
        bounceType: null,
        bounceAt: null,
        complaintAt: null,
        emailStatus: 'pending',
        inviteSentAt: null,
      },
    ]
    const { service, serviceEmail, getResolved } =
      makeMultiLangService(participants)

    const result = await service.send({
      surveyId: SURVEY_ID,
      projectId: PROJECT_ID,
    })

    expect(result.queued).toBe(2)
    expect(getResolved).toHaveBeenCalledWith(
      expect.objectContaining({ lang: 'en' }),
    )
    expect(getResolved).toHaveBeenCalledWith(
      expect.objectContaining({ lang: 'fr' }),
    )

    const sentSubjects = serviceEmail.enqueue.mock.calls.map(
      ([record]) => record.subject,
    )
    expect(sentSubjects).toContain('Invite EN')
    expect(sentSubjects).toContain('Invite FR')
  })

  test('a participant whose language has no matching template is recorded as a batch error without blocking others', async () => {
    const participants = [
      {
        _id: 'p-de',
        email: 'de@example.com',
        nameFirst: 'Dieter',
        token: 'TOK-DE',
        emailVerifyToken: 'evt-de',
        language: 'de',
        bounceType: null,
        bounceAt: null,
        complaintAt: null,
        emailStatus: 'pending',
        inviteSentAt: null,
      },
      {
        _id: 'p-en',
        email: 'en@example.com',
        nameFirst: 'Ann',
        token: 'TOK-EN',
        emailVerifyToken: 'evt-en',
        language: 'en',
        bounceType: null,
        bounceAt: null,
        complaintAt: null,
        emailStatus: 'pending',
        inviteSentAt: null,
      },
    ]
    const { service, serviceEmail } = makeMultiLangService(participants)

    const result = await service.send({
      surveyId: SURVEY_ID,
      projectId: PROJECT_ID,
    })

    expect(result.queued).toBe(1)
    expect(result.errors).toBe(1)
    expect(result.batchErrors).toContainEqual(
      expect.objectContaining({ email: 'de@example.com' }),
    )
    expect(serviceEmail.enqueue).toHaveBeenCalledTimes(1)
    const [emailRecord] = serviceEmail.enqueue.mock.calls[0]
    expect(emailRecord.to).toBe('en@example.com')
  })
})
