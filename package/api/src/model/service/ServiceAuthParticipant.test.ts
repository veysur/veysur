// cspell:ignore Bonjour
import { ServerErrorForbidden, ServerErrorBadRequest } from '@datacapy/server'
import { ServiceAuthParticipant } from './ServiceAuthParticipant'

const SURVEY_ID = 'survey-1'
const PROJECT_ID = 'project-1'
const SNAPSHOT_ID = 'snapshot-1'
const PUBLICATION_ID = 'pub-1'
const PARTICIPANT_ID = 'participant-1'
const PARTICIPANT_TOKEN = 'valid-token'

const mockPublication = { _id: PUBLICATION_ID, snapshotId: SNAPSHOT_ID }

const makeSnapshot = (
  open: boolean,
  publicReg: boolean,
  anonymous = false,
) => ({
  _id: SNAPSHOT_ID,
  surveyPartial: {
    access: { open, publicReg, anonymous },
    schedule: { start: null, end: null },
  },
})

const makeService = (
  open: boolean,
  publicReg: boolean,
  participantToken?: string,
  participantOverrides: Record<string, unknown> = {},
  existingResponse: Record<string, unknown> | null = null,
  anonymous = false,
) => {
  const service = new ServiceAuthParticipant() as unknown as Omit<
    ServiceAuthParticipant,
    'getRepo' | 'createJsonWebToken'
  > & {
    getRepo: jest.Mock
    createJsonWebToken: jest.Mock
  }

  const repoPublication = {
    findOne: jest.fn().mockResolvedValue(mockPublication),
  }
  const repoSurveySnapshot = {
    findOne: jest
      .fn()
      .mockResolvedValue(makeSnapshot(open, publicReg, anonymous)),
  }
  const repoSurveyParticipant = {
    findOne: jest
      .fn()
      .mockResolvedValue(
        participantToken
          ? { _id: PARTICIPANT_ID, ...participantOverrides }
          : null,
      ),
    updateOne: jest.fn().mockResolvedValue(undefined),
  }
  const repoSurveyResponse = {
    findOne: jest.fn().mockResolvedValue(existingResponse),
  }

  service.getRepo = jest.fn((name: string) => {
    if (name === 'surveyPublication') return repoPublication
    if (name === 'surveySnapshotPartial') return repoSurveySnapshot
    if (name === 'surveyParticipant') return repoSurveyParticipant
    if (name === 'surveyResponse') return repoSurveyResponse
    throw new Error(`Unexpected repo: ${name}`)
  })

  service.createJsonWebToken = jest
    .fn()
    .mockImplementation((jwtParticipant) => ({
      jwt: 'signed-token',
      jwtParticipant,
    }))

  return {
    service,
    repoSurveyParticipant,
    repoPublication,
    repoSurveySnapshot,
    repoSurveyResponse,
  }
}

interface SuppressionRecord {
  email: string
  reason: string
  expiresAt: Date | null
}

interface SuppressionQuery {
  email: string
  $or?: Array<{ expiresAt: null | { $gt: Date } }>
}

// Simulates the MongoDB expiry filter so tests exercise the real query shape
// the service passes to the repo, rather than a fixed mocked return value.
const mockSuppressionQuery = (
  repoEmailSuppression: { findOne: jest.Mock },
  suppression: SuppressionRecord,
) => {
  repoEmailSuppression.findOne.mockImplementation(
    async (query: SuppressionQuery) => {
      if (query.email !== suppression.email) return null
      if (!query.$or) return suppression
      const isLive = query.$or.some((cond) => {
        if (cond.expiresAt === null) return suppression.expiresAt === null
        return (
          suppression.expiresAt !== null &&
          suppression.expiresAt > cond.expiresAt.$gt
        )
      })
      return isLive ? suppression : null
    },
  )
}

const authArgs = (
  token?: string,
  emailVerifyToken?: string,
  embedOrigin?: string,
) => ({
  surveyId: SURVEY_ID,
  projectId: PROJECT_ID,
  token,
  emailVerifyToken,
  embedOrigin,
  jwtConfig: {},
})

describe('ServiceAuthParticipant.auth — no-token access control matrix', () => {
  test('open:false publicReg:true → throws ERROR_REG_REQUIRED (was previously unreachable — fell through to anonymous JWT)', async () => {
    const { service } = makeService(false, true)
    await expect(service.auth(authArgs())).rejects.toMatchObject({
      constructor: ServerErrorForbidden,
      ref: 'ERROR_REG_REQUIRED',
    })
  })

  test('open:true publicReg:true → throws ERROR_REG_REQUIRED', async () => {
    const { service } = makeService(true, true)
    await expect(service.auth(authArgs())).rejects.toMatchObject({
      constructor: ServerErrorForbidden,
      ref: 'ERROR_REG_REQUIRED',
    })
  })

  test('open:true publicReg:false → returns anonymous JWT (participantId null)', async () => {
    const { service } = makeService(true, false)
    const result = await service.auth(authArgs())
    expect(service.createJsonWebToken).toHaveBeenCalledWith(
      expect.objectContaining({ participantId: null }),
      expect.anything(),
    )
    expect(result).toMatchObject({ jwt: 'signed-token' })
  })

  test('open:false publicReg:false → throws ERROR_INVALID_TOKEN', async () => {
    const { service } = makeService(false, false)
    await expect(service.auth(authArgs())).rejects.toMatchObject({
      constructor: ServerErrorForbidden,
      ref: 'ERROR_INVALID_TOKEN',
    })
  })
})

describe('ServiceAuthParticipant.auth — participant lookup query shape', () => {
  test('publication lookup query does not filter on the removed projectId field', async () => {
    const { service, repoPublication } = makeService(true, false)
    await service.auth(authArgs())
    expect(repoPublication.findOne).toHaveBeenCalledWith(
      { surveyId: SURVEY_ID, stoppedAt: null },
      expect.anything(),
    )
  })
})

describe('ServiceAuthParticipant.auth — token-based auth', () => {
  test('valid token with matching participant → returns JWT with participant id', async () => {
    const { service } = makeService(false, false, PARTICIPANT_TOKEN)
    const result = await service.auth(authArgs(PARTICIPANT_TOKEN))
    expect(service.createJsonWebToken).toHaveBeenCalledWith(
      expect.objectContaining({ participantId: PARTICIPANT_ID }),
      expect.anything(),
    )
    expect(result).toMatchObject({ jwt: 'signed-token' })
  })

  test('anonymous survey → JWT drops the participant id, keeps a non-time-based sessionId', async () => {
    const { service } = makeService(
      false,
      false,
      PARTICIPANT_TOKEN,
      {},
      null,
      true,
    )
    await service.auth(authArgs(PARTICIPANT_TOKEN))

    const jwtParticipant = service.createJsonWebToken.mock.calls[0][0]
    expect(jwtParticipant.participantId).toBeNull()
    expect(jwtParticipant.sessionId).toMatch(/^[0-9A-Za-z]{1,17}$/)
  })
})

describe('ServiceAuthParticipant.auth — resuming a started survey', () => {
  const ORIGINAL_SNAPSHOT_ID = 'snapshot-original'
  const ORIGINAL_PUBLICATION_ID = 'pub-original'

  test('no in-progress response → JWT uses the current live publication/snapshot, reset is falsy', async () => {
    const { service, repoSurveyResponse } = makeService(
      false,
      false,
      PARTICIPANT_TOKEN,
      {},
      null,
    )
    const result = await service.auth(authArgs(PARTICIPANT_TOKEN))

    expect(repoSurveyResponse.findOne).toHaveBeenCalledWith(
      {
        surveyId: SURVEY_ID,
        participantId: PARTICIPANT_ID,
        completed: false,
      },
      expect.objectContaining({ sort: { createdAt: -1 } }),
    )
    expect(service.createJsonWebToken).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshotId: SNAPSHOT_ID,
        publicationId: PUBLICATION_ID,
      }),
      expect.anything(),
    )
    expect(result).toMatchObject({ reset: false })
  })

  test('in-progress response on the same (live) snapshot → JWT still uses the live publication/snapshot', async () => {
    const { service } = makeService(
      false,
      false,
      PARTICIPANT_TOKEN,
      {},
      {
        snapshotId: SNAPSHOT_ID,
        publicationId: 'some-older-publication',
      },
    )
    const result = await service.auth(authArgs(PARTICIPANT_TOKEN))

    expect(service.createJsonWebToken).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshotId: SNAPSHOT_ID,
        publicationId: PUBLICATION_ID,
      }),
      expect.anything(),
    )
    expect(result).toMatchObject({ reset: false })
  })

  test('in-progress response on a different snapshot that still exists → JWT resumes against the original publication/snapshot', async () => {
    const { service, repoSurveySnapshot } = makeService(
      false,
      false,
      PARTICIPANT_TOKEN,
      {},
      {
        snapshotId: ORIGINAL_SNAPSHOT_ID,
        publicationId: ORIGINAL_PUBLICATION_ID,
        answers: { q1: true },
      },
    )
    repoSurveySnapshot.findOne.mockImplementation(
      async (query: { _id?: string }) => {
        if (query._id === ORIGINAL_SNAPSHOT_ID) {
          return { _id: ORIGINAL_SNAPSHOT_ID }
        }
        return makeSnapshot(false, false)
      },
    )

    const result = await service.auth(authArgs(PARTICIPANT_TOKEN))

    expect(service.createJsonWebToken).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshotId: ORIGINAL_SNAPSHOT_ID,
        publicationId: ORIGINAL_PUBLICATION_ID,
      }),
      expect.anything(),
    )
    expect(result).toMatchObject({ reset: false })
  })

  test('in-progress response on a different snapshot but with no answers saved (e.g. just clicked "Start") → JWT uses the current live publication/snapshot, reset is falsy', async () => {
    const { service, repoSurveySnapshot } = makeService(
      false,
      false,
      PARTICIPANT_TOKEN,
      {},
      {
        snapshotId: ORIGINAL_SNAPSHOT_ID,
        publicationId: ORIGINAL_PUBLICATION_ID,
        answers: {},
      },
    )
    repoSurveySnapshot.findOne.mockImplementation(
      async (query: { _id?: string }) => {
        if (query._id === ORIGINAL_SNAPSHOT_ID) {
          return { _id: ORIGINAL_SNAPSHOT_ID }
        }
        return makeSnapshot(false, false)
      },
    )

    const result = await service.auth(authArgs(PARTICIPANT_TOKEN))

    expect(service.createJsonWebToken).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshotId: SNAPSHOT_ID,
        publicationId: PUBLICATION_ID,
      }),
      expect.anything(),
    )
    expect(result).toMatchObject({ reset: false })
  })

  test('in-progress response on a different snapshot that no longer exists → resets to the live publication/snapshot and flags reset', async () => {
    const { service, repoSurveySnapshot } = makeService(
      false,
      false,
      PARTICIPANT_TOKEN,
      {},
      {
        snapshotId: ORIGINAL_SNAPSHOT_ID,
        publicationId: ORIGINAL_PUBLICATION_ID,
        answers: { q1: true },
      },
    )
    repoSurveySnapshot.findOne.mockImplementation(
      async (query: { _id?: string }) => {
        if (query._id === ORIGINAL_SNAPSHOT_ID) return null
        return makeSnapshot(false, false)
      },
    )

    const result = await service.auth(authArgs(PARTICIPANT_TOKEN))

    expect(service.createJsonWebToken).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshotId: SNAPSHOT_ID,
        publicationId: PUBLICATION_ID,
      }),
      expect.anything(),
    )
    expect(result).toMatchObject({ reset: true })
  })
})

describe('ServiceAuthParticipant.auth — email verification via emailVerifyToken', () => {
  test('matching emailVerifyToken on a pending participant flips emailStatus to verified', async () => {
    const { service, repoSurveyParticipant } = makeService(
      false,
      false,
      PARTICIPANT_TOKEN,
      { emailStatus: 'pending', emailVerifyToken: 'the-verify-token' },
    )
    await service.auth(authArgs(PARTICIPANT_TOKEN, 'the-verify-token'))
    expect(repoSurveyParticipant.updateOne).toHaveBeenCalledWith(
      { _id: PARTICIPANT_ID },
      { $set: { emailStatus: 'verified', updatedAt: expect.any(Date) } },
      expect.anything(),
    )
  })

  test('missing emailVerifyToken does not flip a pending participant', async () => {
    const { service, repoSurveyParticipant } = makeService(
      false,
      false,
      PARTICIPANT_TOKEN,
      { emailStatus: 'pending', emailVerifyToken: 'the-verify-token' },
    )
    await service.auth(authArgs(PARTICIPANT_TOKEN))
    expect(repoSurveyParticipant.updateOne).not.toHaveBeenCalled()
  })

  test('mismatched emailVerifyToken does not flip a pending participant', async () => {
    const { service, repoSurveyParticipant } = makeService(
      false,
      false,
      PARTICIPANT_TOKEN,
      { emailStatus: 'pending', emailVerifyToken: 'the-verify-token' },
    )
    await service.auth(authArgs(PARTICIPANT_TOKEN, 'wrong-token'))
    expect(repoSurveyParticipant.updateOne).not.toHaveBeenCalled()
  })

  test('already-verified participant is untouched even with a matching emailVerifyToken', async () => {
    const { service, repoSurveyParticipant } = makeService(
      false,
      false,
      PARTICIPANT_TOKEN,
      { emailStatus: 'verified', emailVerifyToken: 'the-verify-token' },
    )
    await service.auth(authArgs(PARTICIPANT_TOKEN, 'the-verify-token'))
    expect(repoSurveyParticipant.updateOne).not.toHaveBeenCalled()
  })

  test('already-invalid participant is untouched even with a matching emailVerifyToken', async () => {
    const { service, repoSurveyParticipant } = makeService(
      false,
      false,
      PARTICIPANT_TOKEN,
      { emailStatus: 'invalid', emailVerifyToken: 'the-verify-token' },
    )
    await service.auth(authArgs(PARTICIPANT_TOKEN, 'the-verify-token'))
    expect(repoSurveyParticipant.updateOne).not.toHaveBeenCalled()
  })
})

describe('ServiceAuthParticipant.register — registration email uses participant language', () => {
  const makeRegisterService = () => {
    const service = new ServiceAuthParticipant() as unknown as Omit<
      ServiceAuthParticipant,
      'getRepo' | 'getService' | 'config'
    > & {
      getRepo: jest.Mock
      getService: jest.Mock
      config: unknown
    }

    const repoPublication = {
      findOne: jest.fn().mockResolvedValue(mockPublication),
    }
    const repoSurveySnapshot = {
      findOne: jest.fn().mockResolvedValue(makeSnapshot(false, true)),
    }
    const repoSurveyParticipant = {
      findOne: jest.fn().mockResolvedValue(null), // no existing participant with this email
      find: jest.fn().mockResolvedValue([]), // token uniqueness check
      create: jest.fn().mockResolvedValue(undefined),
      updateOne: jest.fn().mockResolvedValue(undefined),
    }
    const repoSurvey = {
      findOne: jest
        .fn()
        .mockResolvedValue({ _id: SURVEY_ID, name: 'My Survey' }),
    }
    const repoSettingSurvey = {
      findOne: jest.fn().mockResolvedValue(null),
    }
    const serviceProject = {
      getById: jest.fn().mockResolvedValue({
        _id: PROJECT_ID,
        name: 'Project',
        ownerId: 'owner_1',
      }),
    }
    const repoEmailSuppression = {
      findOne: jest.fn().mockResolvedValue(null),
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
      send: jest.fn().mockImplementation(async (record) => {
        record.error = undefined
      }),
    }
    const serviceGeo = {
      detectCountry: jest.fn().mockResolvedValue({ country: '' }),
      isCountryBlocked: jest.fn().mockReturnValue(false),
    }
    const serviceEmailDomainCheck = {
      isDisposableEmailDomain: jest.fn().mockResolvedValue(false),
    }

    service.getRepo = jest.fn((name: string) => {
      if (name === 'surveyPublication') return repoPublication
      if (name === 'surveySnapshotPartial') return repoSurveySnapshot
      if (name === 'surveyParticipant') return repoSurveyParticipant
      if (name === 'survey') return repoSurvey
      if (name === 'settingSurvey') return repoSettingSurvey
      if (name === 'emailSuppression') return repoEmailSuppression
      throw new Error(`Unexpected repo: ${name}`)
    })

    service.getService = jest.fn((name: string) => {
      if (name === 'email') return serviceEmail
      if (name === 'emailTemplate') return serviceEmailTemplate
      if (name === 'geo') return serviceGeo
      if (name === 'emailDomainCheck') return serviceEmailDomainCheck
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
      serviceEmail,
      getResolved,
      serviceGeo,
      serviceEmailDomainCheck,
      repoEmailSuppression,
    }
  }

  test('a participant registering with language "fr" receives the French template', async () => {
    const { service, serviceEmail, getResolved } = makeRegisterService()

    await service.register({
      surveyId: SURVEY_ID,
      projectId: PROJECT_ID,
      nameFirst: 'Bernard',
      nameLast: 'Dupont',
      email: 'bernard@example.com',
      language: 'fr',
      attributes: {},
    })

    expect(getResolved).toHaveBeenCalledWith(
      expect.objectContaining({ lang: 'fr' }),
    )
    expect(serviceEmail.send).toHaveBeenCalledTimes(1)
    const [emailRecord] = serviceEmail.send.mock.calls[0]
    expect(emailRecord.subject).toBe('Invite FR')
  })

  test('a participant registering without a language falls back to "en"', async () => {
    const { service, getResolved } = makeRegisterService()

    await service.register({
      surveyId: SURVEY_ID,
      projectId: PROJECT_ID,
      nameFirst: 'Ann',
      nameLast: 'Smith',
      email: 'ann@example.com',
      language: undefined,
      attributes: {},
    })

    expect(getResolved).toHaveBeenCalledWith(
      expect.objectContaining({ lang: 'en' }),
    )
  })

  test('rejects registration from a blocked country', async () => {
    const { service, serviceGeo } = makeRegisterService()
    serviceGeo.detectCountry.mockResolvedValue({ country: 'CH' })
    serviceGeo.isCountryBlocked.mockReturnValue(true)

    await expect(
      service.register({
        surveyId: SURVEY_ID,
        projectId: PROJECT_ID,
        nameFirst: 'Hans',
        nameLast: 'Muster',
        email: 'hans@example.com',
        language: 'en',
        attributes: {},
        ip: '1.2.3.4',
      }),
    ).rejects.toMatchObject({
      constructor: ServerErrorForbidden,
      ref: 'ERROR_COUNTRY_BLOCKED',
    })
  })

  test('rejects registration from a disposable email domain', async () => {
    const { service, serviceEmailDomainCheck } = makeRegisterService()
    serviceEmailDomainCheck.isDisposableEmailDomain.mockResolvedValue(true)

    await expect(
      service.register({
        surveyId: SURVEY_ID,
        projectId: PROJECT_ID,
        nameFirst: 'Ann',
        nameLast: 'Smith',
        email: 'ann@mailinator.com',
        language: 'en',
        attributes: {},
      }),
    ).rejects.toMatchObject({
      constructor: ServerErrorBadRequest,
      ref: 'ERROR_DISPOSABLE_EMAIL_DOMAIN',
    })
  })

  test('an expired suppression record no longer blocks the registration email', async () => {
    const { service, serviceEmail, repoEmailSuppression } =
      makeRegisterService()
    mockSuppressionQuery(repoEmailSuppression, {
      email: 'erin@example.com',
      reason: 'hardBounce',
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // expired yesterday
    })

    await service.register({
      surveyId: SURVEY_ID,
      projectId: PROJECT_ID,
      nameFirst: 'Erin',
      nameLast: 'Expired',
      email: 'erin@example.com',
      language: 'en',
      attributes: {},
    })

    expect(serviceEmail.send).toHaveBeenCalledTimes(1)
  })

  test('a live suppression record still blocks the registration email', async () => {
    const { service, serviceEmail, repoEmailSuppression } =
      makeRegisterService()
    mockSuppressionQuery(repoEmailSuppression, {
      email: 'bob@example.com',
      reason: 'hardBounce',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // still live
    })

    await service.register({
      surveyId: SURVEY_ID,
      projectId: PROJECT_ID,
      nameFirst: 'Bob',
      nameLast: 'Bounced',
      email: 'bob@example.com',
      language: 'en',
      attributes: {},
    })

    expect(serviceEmail.send).not.toHaveBeenCalled()
  })
})

describe('ServiceAuthParticipant.register — email verification & sent-status wiring', () => {
  const makeRegisterService = () => {
    const service = new ServiceAuthParticipant() as unknown as Omit<
      ServiceAuthParticipant,
      'getRepo' | 'getService' | 'config'
    > & {
      getRepo: jest.Mock
      getService: jest.Mock
      config: unknown
    }

    const repoPublication = {
      findOne: jest.fn().mockResolvedValue(mockPublication),
    }
    const repoSurveySnapshot = {
      findOne: jest.fn().mockResolvedValue(makeSnapshot(false, true)),
    }
    const repoSurveyParticipant = {
      findOne: jest.fn().mockResolvedValue(null), // overridden per-test
      find: jest.fn().mockResolvedValue([]), // token uniqueness check
      create: jest.fn().mockResolvedValue(undefined),
      updateOne: jest.fn().mockResolvedValue(undefined),
    }
    const repoSurvey = {
      findOne: jest
        .fn()
        .mockResolvedValue({ _id: SURVEY_ID, name: 'My Survey' }),
    }
    const repoSettingSurvey = {
      findOne: jest.fn().mockResolvedValue(null),
    }
    const serviceProject = {
      getById: jest.fn().mockResolvedValue({
        _id: PROJECT_ID,
        name: 'Project',
        ownerId: 'owner_1',
      }),
    }
    const repoEmailSuppression = {
      findOne: jest.fn().mockResolvedValue(null),
    }

    const getResolved = jest.fn(async () => ({
      subject: 'Invite EN',
      body: 'Hello {{participant.nameFirst}} {{survey.link}}',
    }))
    const serviceEmailTemplate = { getResolved }
    const serviceEmail = {
      send: jest.fn().mockImplementation(async (record) => {
        record.error = undefined
      }),
    }
    const serviceGeo = {
      detectCountry: jest.fn().mockResolvedValue({ country: '' }),
      isCountryBlocked: jest.fn().mockReturnValue(false),
    }
    const serviceEmailDomainCheck = {
      isDisposableEmailDomain: jest.fn().mockResolvedValue(false),
    }

    service.getRepo = jest.fn((name: string) => {
      if (name === 'surveyPublication') return repoPublication
      if (name === 'surveySnapshotPartial') return repoSurveySnapshot
      if (name === 'surveyParticipant') return repoSurveyParticipant
      if (name === 'survey') return repoSurvey
      if (name === 'settingSurvey') return repoSettingSurvey
      if (name === 'emailSuppression') return repoEmailSuppression
      throw new Error(`Unexpected repo: ${name}`)
    })

    service.getService = jest.fn((name: string) => {
      if (name === 'email') return serviceEmail
      if (name === 'emailTemplate') return serviceEmailTemplate
      if (name === 'geo') return serviceGeo
      if (name === 'emailDomainCheck') return serviceEmailDomainCheck
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
      serviceEmail,
      repoSurveyParticipant,
      serviceProject,
      serviceEmailDomainCheck,
    }
  }

  test('registering a new participant generates an emailVerifyToken, includes it as ?evt= on the survey link, and stamps inviteSentAt', async () => {
    const { service, serviceEmail } = makeRegisterService()

    await service.register({
      surveyId: SURVEY_ID,
      projectId: PROJECT_ID,
      nameFirst: 'New',
      nameLast: 'Participant',
      email: 'new@example.com',
      language: 'en',
      attributes: {},
    })

    expect(serviceEmail.send).toHaveBeenCalledTimes(1)
    const [emailRecord] = serviceEmail.send.mock.calls[0]
    expect(emailRecord.templateData.survey.link).toMatch(
      /\/survey\/survey-1\/[^?]+\?evt=.+/,
    )
  })

  test('re-registering an existing participant without emailVerifyToken backfills it before sending the reminder', async () => {
    const { service, serviceEmail, repoSurveyParticipant } =
      makeRegisterService()
    repoSurveyParticipant.findOne.mockResolvedValue({
      _id: PARTICIPANT_ID,
      email: 'existing@example.com',
      token: PARTICIPANT_TOKEN,
      language: 'en',
      emailVerifyToken: null,
      reminderSentAt: null,
    })

    await service.register({
      surveyId: SURVEY_ID,
      projectId: PROJECT_ID,
      nameFirst: 'Existing',
      nameLast: 'Participant',
      email: 'existing@example.com',
      language: 'en',
      attributes: {},
    })

    expect(repoSurveyParticipant.updateOne).toHaveBeenCalledWith(
      { _id: PARTICIPANT_ID },
      { $set: { emailVerifyToken: expect.any(String) } },
      expect.anything(),
    )
    const [emailRecord] = serviceEmail.send.mock.calls[0]
    expect(emailRecord.templateData.survey.link).toContain('?evt=')
  })

  test('a successful send sets inviteSentAt (not inviteSent) for a first-time registration', async () => {
    const { service, repoSurveyParticipant } = makeRegisterService()

    await service.register({
      surveyId: SURVEY_ID,
      projectId: PROJECT_ID,
      nameFirst: 'New',
      nameLast: 'Participant',
      email: 'new2@example.com',
      language: 'en',
      attributes: {},
    })

    expect(repoSurveyParticipant.updateOne).toHaveBeenCalledWith(
      { _id: expect.any(String) },
      { $set: { inviteSentAt: expect.any(Date), updatedAt: expect.any(Date) } },
      expect.anything(),
    )
  })

  test('a successful reminder send sets reminderSentAt (not reminderSent) for an existing participant', async () => {
    const { service, repoSurveyParticipant } = makeRegisterService()
    repoSurveyParticipant.findOne.mockResolvedValue({
      _id: PARTICIPANT_ID,
      email: 'existing2@example.com',
      token: PARTICIPANT_TOKEN,
      language: 'en',
      emailVerifyToken: 'already-has-one',
      reminderSentAt: null,
    })

    await service.register({
      surveyId: SURVEY_ID,
      projectId: PROJECT_ID,
      nameFirst: 'Existing',
      nameLast: 'Participant',
      email: 'existing2@example.com',
      language: 'en',
      attributes: {},
    })

    expect(repoSurveyParticipant.updateOne).toHaveBeenCalledWith(
      { _id: PARTICIPANT_ID },
      {
        $set: { reminderSentAt: expect.any(Date), updatedAt: expect.any(Date) },
      },
      expect.anything(),
    )
  })
})

describe('ServiceAuthParticipant.auth — embed origin', () => {
  const makeEmbedService = (embed: boolean, embedDomains: string[]) => {
    const made = makeService(true, false)
    made.repoSurveySnapshot.findOne.mockResolvedValue({
      _id: SNAPSHOT_ID,
      surveyPartial: {
        access: { open: true, publicReg: false, embed, embedDomains },
        schedule: { start: null, end: null },
      },
    })
    return made.service
  }

  test('no embed origin (normal survey page) is unaffected by embed settings', async () => {
    const service = makeEmbedService(false, [])
    await expect(service.auth(authArgs())).resolves.toMatchObject({
      jwt: 'signed-token',
    })
  })

  test('embed origin on a survey with embedding disabled is rejected', async () => {
    const service = makeEmbedService(false, [])
    await expect(
      service.auth(authArgs(undefined, undefined, 'https://host.example')),
    ).rejects.toMatchObject({
      constructor: ServerErrorForbidden,
      ref: 'ERROR_EMBED_NOT_ALLOWED',
    })
  })

  test('embed origin outside the allowed domains is rejected', async () => {
    const service = makeEmbedService(true, ['allowed.example'])
    await expect(
      service.auth(authArgs(undefined, undefined, 'https://other.example')),
    ).rejects.toMatchObject({ ref: 'ERROR_EMBED_NOT_ALLOWED' })
  })

  test('embed origin on an allowed domain gets an anonymous-compatible JWT', async () => {
    const service = makeEmbedService(true, ['allowed.example'])
    await service.auth(
      authArgs(undefined, undefined, 'https://www.allowed.example'),
    )
    expect(service.createJsonWebToken).toHaveBeenCalledWith(
      expect.objectContaining({ participantId: null }),
      expect.anything(),
    )
  })
})
