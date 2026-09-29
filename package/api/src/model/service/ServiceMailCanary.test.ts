// cspell:ignore ECONNREFUSED
import { ServiceMailCanary } from './ServiceMailCanary'
import { asPrivate } from 'test-utils/asPrivate'

jest.mock('imapflow')
jest.mock('@sentry/node', () => ({
  captureException: jest.fn(),
  withScope: (cb: (scope: { setFingerprint: jest.Mock }) => void) =>
    cb({ setFingerprint: jest.fn() }),
}))
jest.mock('@datacapy/id', () => ({
  genUniqueId: jest.fn(() => 'test-token-123'),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Sentry = require('@sentry/node') as { captureException: jest.Mock }

type ServicePrivateOverrides = {
  logger: { log: jest.Mock }
  config: unknown
  getService: jest.Mock
}

const withPrivates = (service: ServiceMailCanary) =>
  asPrivate<ServiceMailCanary, ServicePrivateOverrides>(service)

const baseConfig = {
  model: {
    app: {
      mail: {
        imap: {
          host: 'mail.veysur.com',
          port: 993,
          caCert: null,
        },
        canary: {
          to: 'canary@mail.veysur.com',
          user: 'canary',
          pass: 'secret',
          timeoutSeconds: 0.1,
          pollIntervalSeconds: 0.02,
        },
      },
    },
  },
}

describe('ServiceMailCanary', () => {
  let service: ServiceMailCanary
  let mockServiceEmail: { send: jest.Mock }

  beforeEach(() => {
    jest.clearAllMocks()

    service = new ServiceMailCanary()
    withPrivates(service).logger = { log: jest.fn() }
    withPrivates(service).config = baseConfig

    mockServiceEmail = { send: jest.fn().mockResolvedValue(undefined) }
    withPrivates(service).getService = jest
      .fn()
      .mockImplementation((name: string) =>
        name === 'email' ? mockServiceEmail : {},
      )
  })

  test('returns early without sending when canary mailbox is not configured', async () => {
    withPrivates(service).config = {
      model: {
        app: {
          mail: { imap: { host: null }, canary: { to: null } },
        },
      },
    }

    const result = await service.run()

    expect(result).toEqual({ delivered: false, elapsedMs: 0 })
    expect(mockServiceEmail.send).not.toHaveBeenCalled()
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('not configured'),
      }),
    )
  })

  // The IMAP poll loop uses real setTimeout delays, which stall forever under
  // the globally-enabled Jest fake timers - switch to real timers for these.
  describe('with real timers', () => {
    beforeAll(() => jest.useRealTimers())
    afterAll(() => jest.useFakeTimers())

    test('sends a probe and confirms delivery when a matching message is found', async () => {
      const messageDelete = jest.fn().mockResolvedValue(true)
      const mockImapClient = {
        connect: jest.fn().mockResolvedValue(undefined),
        getMailboxLock: jest.fn().mockResolvedValue({ release: jest.fn() }),
        fetch: jest.fn().mockImplementation(async function* () {
          yield {
            uid: 55,
            envelope: { subject: '[VeySur Canary] test-token-123' },
          }
        }),
        messageDelete,
        logout: jest.fn().mockResolvedValue(undefined),
      }

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ImapFlow } = require('imapflow') as { ImapFlow: jest.Mock }
      ImapFlow.mockImplementation(() => mockImapClient)

      const result = await service.run()

      expect(mockServiceEmail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'canary@mail.veysur.com',
          subject: expect.stringContaining('test-token-123'),
        }),
      )
      expect(messageDelete).toHaveBeenCalledWith(55, { uid: true })
      expect(result.delivered).toBe(true)
      expect(Sentry.captureException).not.toHaveBeenCalled()
    })

    test('throws (without alerting directly) when no matching message arrives before the deadline', async () => {
      const mockImapClient = {
        connect: jest.fn().mockResolvedValue(undefined),
        getMailboxLock: jest.fn().mockResolvedValue({ release: jest.fn() }),
        fetch: jest.fn().mockImplementation(async function* () {
          // no messages
        }),
        messageDelete: jest.fn(),
        logout: jest.fn().mockResolvedValue(undefined),
      }

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ImapFlow } = require('imapflow') as { ImapFlow: jest.Mock }
      ImapFlow.mockImplementation(() => mockImapClient)

      await expect(service.run()).rejects.toThrow(/not confirmed delivered/)

      // ServiceTaskManager owns escalation now — it captures once the task has
      // failed twice in a row, not on a single failed run.
      expect(Sentry.captureException).not.toHaveBeenCalled()
    })

    test('rethrows (without alerting directly) when the IMAP connection fails', async () => {
      const connectError = new Error('ECONNREFUSED')
      const mockImapClient = {
        connect: jest.fn().mockRejectedValue(connectError),
        getMailboxLock: jest.fn(),
        fetch: jest.fn(),
        messageDelete: jest.fn(),
        logout: jest.fn().mockResolvedValue(undefined),
      }

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ImapFlow } = require('imapflow') as { ImapFlow: jest.Mock }
      ImapFlow.mockImplementation(() => mockImapClient)

      await expect(service.run()).rejects.toThrow('ECONNREFUSED')

      expect(Sentry.captureException).not.toHaveBeenCalled()
    })
  })
})
