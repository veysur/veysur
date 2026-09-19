import { ServiceSurveyCompletionEmail } from './ServiceSurveyCompletionEmail'

const PROJECT_ID = 'project-1'
const SURVEY_ID = 'survey-1'
const SNAPSHOT_ID = 'snapshot-1'
const PARTICIPANT_ID = 'participant-1'

const makeService = ({
  surveyOverrides = {},
  settingSurveyOverrides = {},
  projectOverrides = {},
  participant = {
    _id: PARTICIPANT_ID,
    email: 'jane@example.com',
    nameFirst: 'Jane',
    language: 'fr',
    attributes: {},
  } as Record<string, unknown> | null,
  owner = { _id: 'owner-1', email: 'owner@example.com' },
  suppressedEmails = [] as string[],
  sendImpl,
}: {
  surveyOverrides?: Record<string, unknown>
  settingSurveyOverrides?: Record<string, unknown>
  projectOverrides?: Record<string, unknown>
  participant?: Record<string, unknown> | null
  owner?: Record<string, unknown> | null
  suppressedEmails?: string[]
  sendImpl?: (record: Record<string, unknown>) => Promise<void>
} = {}) => {
  const service = new ServiceSurveyCompletionEmail() as unknown as Omit<
    ServiceSurveyCompletionEmail,
    'getRepo' | 'getService' | 'config' | 'logger'
  > & {
    getRepo: jest.Mock
    getService: jest.Mock
    config: unknown
    logger: { log: jest.Mock }
  }

  const repoSurvey = {
    findOne: jest.fn().mockResolvedValue({
      _id: SURVEY_ID,
      name: 'My Survey',
      ...surveyOverrides,
    }),
  }
  const repoSettingSurvey = {
    findOne: jest.fn().mockResolvedValue({
      projectId: PROJECT_ID,
      ...settingSurveyOverrides,
    }),
  }
  const serviceProject = {
    getById: jest.fn().mockResolvedValue({
      _id: PROJECT_ID,
      ownerId: owner?._id ?? null,
      name: 'My Project',
      ...projectOverrides,
    }),
  }
  const repoSurveyParticipant = {
    findOne: jest.fn().mockResolvedValue(participant),
  }
  const repoUser = {
    findOne: jest.fn().mockResolvedValue(owner),
  }
  const repoEmailSuppression = {
    findOne: jest.fn().mockImplementation(async ({ email }) => {
      return suppressedEmails.includes(email) ? { email } : null
    }),
  }

  const serviceEmailTemplate = {
    getResolved: jest.fn().mockImplementation(async ({ type }) => ({
      subject: `Subject: ${type}`,
      body: `Body for {{participant.nameFirst}}`,
    })),
  }
  const serviceEmail = {
    send: jest.fn().mockImplementation(
      sendImpl ??
        (async (record: Record<string, unknown>) => {
          record.error = undefined
        }),
    ),
  }

  service.getRepo = jest.fn((name: string) => {
    if (name === 'survey') return repoSurvey
    if (name === 'settingSurvey') return repoSettingSurvey
    if (name === 'surveyParticipant') return repoSurveyParticipant
    if (name === 'user') return repoUser
    if (name === 'emailSuppression') return repoEmailSuppression
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
        mail: { bounceAddress: null },
      },
    },
  }

  service.logger = { log: jest.fn() }

  return {
    service,
    serviceProject,
    repoEmailSuppression,
    serviceEmail,
    serviceEmailTemplate,
  }
}

const call = (
  service: Pick<ServiceSurveyCompletionEmail, 'sendCompletionEmails'>,
  overrides = {},
) =>
  service.sendCompletionEmails({
    projectId: PROJECT_ID,
    surveyId: SURVEY_ID,
    snapshotId: SNAPSHOT_ID,
    participantId: PARTICIPANT_ID,
    response: { answers: {} },
    ...overrides,
  })

describe('ServiceSurveyCompletionEmail.sendCompletionEmails', () => {
  test('sends the thank-you email to the participant using their language', async () => {
    const { service, serviceEmail, serviceEmailTemplate } = makeService()

    await call(service)

    expect(serviceEmail.send).toHaveBeenCalledTimes(1)
    expect(serviceEmailTemplate.getResolved).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'thankYou', lang: 'fr' }),
    )
    const [emailRecord] = serviceEmail.send.mock.calls[0]
    expect(emailRecord.to).toBe('jane@example.com')
  })

  test('skips the thank-you email when the survey turns off participant.thankYouEmail', async () => {
    const { service, serviceEmail } = makeService({
      settingSurveyOverrides: { participant: { thankYouEmail: false } },
    })

    await call(service)

    expect(serviceEmail.send).not.toHaveBeenCalled()
  })

  test('skips the thank-you email for a session-only (anonymous) completion with no participant', async () => {
    const { service, serviceEmail } = makeService({ participant: null })

    await call(service, { participantId: undefined, sessionId: 'session-1' })

    expect(serviceEmail.send).not.toHaveBeenCalled()
  })

  test('sends adminBasic to recipients resolved from notify.basic, including {{projectOwner.email}}', async () => {
    const { service, serviceEmail, serviceEmailTemplate } = makeService({
      settingSurveyOverrides: {
        notify: {
          basic: 'manager@example.com;{{projectOwner.email}}',
          detailed: '',
        },
        participant: { thankYouEmail: false },
      },
    })

    await call(service)

    expect(serviceEmail.send).toHaveBeenCalledTimes(2)
    const recipients = serviceEmail.send.mock.calls.map(([r]) => r.to)
    expect(recipients).toEqual(
      expect.arrayContaining(['manager@example.com', 'owner@example.com']),
    )
    expect(serviceEmailTemplate.getResolved).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'adminBasic' }),
    )
  })

  test('skips adminBasic/adminDetail entirely when no recipients resolve', async () => {
    const { service, serviceEmail } = makeService({
      settingSurveyOverrides: {
        participant: { thankYouEmail: false },
      },
    })

    await call(service)

    expect(serviceEmail.send).not.toHaveBeenCalled()
  })

  test('returns without sending if the project cannot be found', async () => {
    const { service, serviceEmail, serviceProject } = makeService()
    serviceProject.getById.mockResolvedValue(null)

    await expect(call(service)).resolves.toBeUndefined()
    expect(serviceEmail.send).not.toHaveBeenCalled()
  })

  test('a suppressed recipient is skipped without blocking other recipients', async () => {
    const { service, serviceEmail } = makeService({
      settingSurveyOverrides: {
        notify: {
          basic: 'suppressed@example.com;manager@example.com',
          detailed: '',
        },
        participant: { thankYouEmail: false },
      },
      suppressedEmails: ['suppressed@example.com'],
    })

    await call(service)

    expect(serviceEmail.send).toHaveBeenCalledTimes(1)
    const [emailRecord] = serviceEmail.send.mock.calls[0]
    expect(emailRecord.to).toBe('manager@example.com')
  })

  test('one send failing does not block sibling sends, and never throws', async () => {
    let callCount = 0
    const { service, serviceEmail } = makeService({
      settingSurveyOverrides: {
        notify: {
          basic: 'first@example.com;second@example.com',
          detailed: '',
        },
        participant: { thankYouEmail: false },
      },
      sendImpl: async (record: Record<string, unknown>) => {
        callCount++
        if (callCount === 1) {
          throw new Error('SMTP failure')
        }
        record.error = undefined
      },
    })

    await expect(call(service)).resolves.toBeUndefined()

    expect(serviceEmail.send).toHaveBeenCalledTimes(2)
  })

  test('admin emails use the survey default language, not the participant language', async () => {
    const { service, serviceEmailTemplate } = makeService({
      settingSurveyOverrides: {
        notify: { basic: 'manager@example.com', detailed: '' },
        language: { default: 'de', options: ['de'] },
      },
    })

    await call(service)

    expect(serviceEmailTemplate.getResolved).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'adminBasic', lang: 'de' }),
    )
  })

  test('does not throw and resolves even if the survey cannot be found', async () => {
    const { service, serviceEmail } = makeService({
      surveyOverrides: undefined,
    })
    ;(service.getRepo('survey').findOne as jest.Mock).mockResolvedValue(null)

    await expect(call(service)).resolves.toBeUndefined()
    expect(serviceEmail.send).not.toHaveBeenCalled()
  })
})
