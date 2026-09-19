// cspell:ignore ECONNREFUSED
import { ServiceEmail } from './ServiceEmail'

jest.mock('@sentry/node', () => ({
  captureException: jest.fn(),
  withScope: (cb: (scope: { setFingerprint: jest.Mock }) => void) =>
    cb({ setFingerprint: jest.fn() }),
}))
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Sentry = require('@sentry/node') as { captureException: jest.Mock }

const makeService = ({
  logOnly = true,
  sendRatePerHour = 150,
}: {
  logOnly?: boolean
  sendRatePerHour?: number
} = {}) => {
  const service = new ServiceEmail() as unknown as Omit<
    ServiceEmail,
    'getRepo' | 'getService' | 'config'
  > & {
    getRepo: jest.Mock
    getService: jest.Mock
    config: unknown
  }

  const repoEmail = {
    save: jest
      .fn()
      .mockImplementation(async (email: Record<string, unknown>) => {
        if (!email._id) email._id = 'email-' + Math.random()
        return email
      }),
    find: jest.fn().mockResolvedValue([]),
  }
  const repoSurveyParticipant = {
    updateOne: jest.fn().mockResolvedValue(undefined),
  }

  service.getRepo = jest.fn((name: string) => {
    if (name === 'email') return repoEmail
    if (name === 'surveyParticipant') return repoSurveyParticipant
    throw new Error(`Unexpected repo: ${name}`)
  })
  service.getService = jest.fn()

  service.config = {
    model: {
      app: {
        companyName: 'Veysur',
        webDomain: 'veysur.local',
        mail: {
          logOnly,
          sendOptions: { from: 'support@veysur.local' },
          queue: { processBatchSize: 200 },
        },
      },
    },
  }

  // The per-project send rate is resolved by the platform guarded subclass;
  // in core it is a flat default. Stub the seam so queue-pacing tests stay
  // deterministic.
  jest
    .spyOn(
      service as unknown as {
        emailSendRatePerHour: () => Promise<number>
      },
      'emailSendRatePerHour',
    )
    .mockResolvedValue(sendRatePerHour)

  // processQueue() paces dispatch attempts with a real setTimeout delay - stub it out
  // so tests run instantly. Timing itself is asserted separately via this spy.
  const sleep = jest
    .spyOn(
      service as unknown as { sleep: (ms: number) => Promise<void> },
      'sleep',
    )
    .mockResolvedValue(undefined)

  return { service, repoEmail, repoSurveyParticipant, sleep }
}

describe('ServiceEmail.enqueue()', () => {
  it('inserts a pending row with the given scheduledAt and resets attempts', async () => {
    const { service, repoEmail } = makeService()
    const scheduledAt = new Date('2026-01-01T12:00:00.000Z')

    const email = { type: 'invite', to: 'jane@example.com', subject: 'Hi' }
    const result = await service.enqueue(email as never, scheduledAt)

    expect(result.status).toBe('pending')
    expect(result.scheduledAt).toBe(scheduledAt)
    expect(result.attempts).toBe(0)
    expect(repoEmail.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending', scheduledAt }),
    )
  })

  it('defaults `from` from config.mail.sendOptions when the caller did not set one - required by the RepoEmail schema', async () => {
    const { service, repoEmail } = makeService()

    const email = { type: 'invite', to: 'jane@example.com', subject: 'Hi' }
    const result = await service.enqueue(email as never, new Date())

    expect(result.from).toBe('support@veysur.local')
    expect(repoEmail.save).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'support@veysur.local' }),
    )
  })

  it('does not override a caller-supplied `from`', async () => {
    const { service } = makeService()

    const email = {
      type: 'invite',
      to: 'jane@example.com',
      subject: 'Hi',
      from: 'custom@veysur.local',
    }
    const result = await service.enqueue(email as never, new Date())

    expect(result.from).toBe('custom@veysur.local')
  })
})

describe('ServiceEmail.send()', () => {
  it('sets status to sent alongside the sent timestamp on success (logOnly mode)', async () => {
    const { service, repoEmail } = makeService({ logOnly: true })

    const email = { type: 'invite', to: 'jane@example.com', subject: 'Hi' }
    await service.send(email as never)

    expect((email as { status?: string }).status).toBe('sent')
    expect((email as { sent?: Date }).sent).toBeInstanceOf(Date)
    expect(repoEmail.save).toHaveBeenCalled()
  })

  it('no-ops on a row that is already marked sent (idempotency guard)', async () => {
    const { service, repoEmail } = makeService()

    const email = { type: 'invite', to: 'jane@example.com', status: 'sent' }
    await service.send(email as never)

    expect(repoEmail.save).not.toHaveBeenCalled()
  })
})

describe('ServiceEmail.processQueue()', () => {
  const makeRow = (
    id: string,
    projectId: string,
    overrides: Record<string, unknown> = {},
  ) => ({
    _id: id,
    projectId,
    type: 'invite',
    to: `${id}@example.com`,
    subject: 'Hi',
    status: 'pending',
    scheduledAt: new Date(Date.now() - 1000),
    data: { participantId: `participant-${id}` },
    ...overrides,
  })

  it('round-robins across projects and caps each project at its per-run derived limit', async () => {
    const { service, repoEmail } = makeService({ sendRatePerHour: 60 })

    const rows = [
      makeRow('a1', 'proj-a'),
      makeRow('a2', 'proj-a'),
      makeRow('b1', 'proj-b'),
      makeRow('c1', 'proj-c'),
    ]
    repoEmail.find = jest.fn().mockResolvedValue(rows)

    const result = await service.processQueue()

    // proj-a is capped at 1 per run even though it has 2 candidate rows
    expect(result.dispatched).toBe(3)
    expect(result.failed).toBe(0)
  })

  it('on successful dispatch sets the participant sent timestamp', async () => {
    const { service, repoEmail, repoSurveyParticipant } = makeService({
      sendRatePerHour: 150,
    })
    repoEmail.find = jest
      .fn()
      .mockResolvedValue([makeRow('r1', 'proj-1', { type: 'reminder' })])

    const result = await service.processQueue()

    expect(result.dispatched).toBe(1)
    expect(repoSurveyParticipant.updateOne).toHaveBeenCalledWith(
      { _id: 'participant-r1' },
      expect.objectContaining({
        $set: expect.objectContaining({ reminderSentAt: expect.any(Date) }),
      }),
      expect.anything(),
    )
  })

  it('paces dispatch attempts evenly across the tick interval', async () => {
    const { service, repoEmail, sleep } = makeService({ sendRatePerHour: 150 })

    const rows = [
      makeRow('a1', 'proj-a'),
      makeRow('b1', 'proj-b'),
      makeRow('c1', 'proj-c'),
    ]
    repoEmail.find = jest.fn().mockResolvedValue(rows)

    const result = await service.processQueue()

    expect(result.dispatched).toBe(3)
    // dispatchBudget = min(3 candidates, 200 batch cap) = 3
    // dispatchDelayMs = floor(60_000 / 3) = 20_000
    // paced between every attempt except the last, so 2 calls, not 3
    expect(sleep).toHaveBeenCalledTimes(2)
    expect(sleep).toHaveBeenCalledWith(20_000)
  })

  it('sizes the pacing delay off what will actually dispatch this run, not the raw candidate count', async () => {
    // Regression test: a single project with a large backlog but a low per-run cap
    // must not be paced as if all its candidates were about to fire - only the rows
    // its own maxPerRun actually allows through this run count toward the budget.
    const { service, repoEmail, sleep } = makeService({ sendRatePerHour: 150 })

    const rows = Array.from({ length: 67 }, (_, i) =>
      makeRow(`x${i}`, 'proj-x'),
    )
    repoEmail.find = jest.fn().mockResolvedValue(rows)

    const result = await service.processQueue()

    expect(result.dispatched).toBe(3)
    // dispatchBudget = min(rows.length, maxPerRun) = min(67, 3) = 3, NOT 67
    // dispatchDelayMs = floor(60_000 / 3) = 20_000
    expect(sleep).toHaveBeenCalledTimes(2)
    expect(sleep).toHaveBeenCalledWith(20_000)
  })

  const spySend = (
    service: unknown,
    impl: () => Promise<void>,
  ): jest.SpyInstance =>
    jest
      .spyOn(service as { send: (row: unknown) => Promise<void> }, 'send')
      .mockImplementation(impl)

  it('captures a dispatch failure to BugSink without throwing', async () => {
    jest.clearAllMocks()
    const { service, repoEmail } = makeService({ sendRatePerHour: 150 })
    repoEmail.find = jest
      .fn()
      .mockResolvedValue([makeRow('a1', 'proj-a'), makeRow('a2', 'proj-a')])

    let calls = 0
    spySend(service, async () => {
      calls++
      if (calls === 1) throw new Error('550 mailbox unavailable')
    })

    const result = await service.processQueue()

    expect(result.failed).toBe(1)
    expect(result.dispatched).toBe(1)
    expect(Sentry.captureException).toHaveBeenCalledTimes(1)
  })

  it('fingerprints a total relay outage as mail-relay-unreachable', async () => {
    jest.clearAllMocks()
    const setFingerprint = jest.fn()
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sentry = require('@sentry/node') as {
      withScope: (cb: (s: { setFingerprint: jest.Mock }) => void) => void
    }
    jest
      .spyOn(sentry, 'withScope')
      .mockImplementation((cb) => cb({ setFingerprint }))

    const { service, repoEmail } = makeService({ sendRatePerHour: 150 })
    repoEmail.find = jest
      .fn()
      .mockResolvedValue([makeRow('a1', 'proj-a'), makeRow('a2', 'proj-a')])

    spySend(service, async () => {
      const err = new Error('connect ECONNREFUSED') as Error & { code: string }
      err.code = 'ECONNREFUSED'
      throw err
    })

    const result = await service.processQueue()

    expect(result.failed).toBe(2)
    expect(setFingerprint).toHaveBeenCalledWith(['mail-relay-unreachable'])
  })

  it('only ever selects status:pending rows, so a failed partial batch is never re-sent', async () => {
    // Re-send safety invariant: send() flips a row to 'sent' (persisted) before
    // returning and to 'error' on failure; processQueue never resets a row to
    // 'pending'. Because the candidate query filters on status:'pending', a row
    // dispatched in an earlier (partly failed) batch is structurally excluded
    // from every later run.
    jest.clearAllMocks()
    const { service, repoEmail } = makeService({ sendRatePerHour: 150 })
    repoEmail.find = jest.fn().mockResolvedValue([makeRow('a1', 'proj-a')])
    spySend(service, async () => {})

    await service.processQueue()

    expect(repoEmail.find).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending' }),
      expect.anything(),
    )
  })
})
