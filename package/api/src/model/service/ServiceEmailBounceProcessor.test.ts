// cspell:ignore VERP Verp Rcpt imapflow surv
import { ServiceEmailBounceProcessor } from './ServiceEmailBounceProcessor'
import type { FetchMessageObject } from 'imapflow'
import { asPrivate } from 'test-utils/asPrivate'

jest.mock('imapflow')

jest.mock('mailparser', () => ({
  simpleParser: jest.fn(),
}))

jest.mock('@sentry/node', () => ({
  captureException: jest.fn(),
  withScope: (cb: (scope: { setFingerprint: jest.Mock }) => void) =>
    cb({ setFingerprint: jest.fn() }),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { simpleParser } = require('mailparser') as { simpleParser: jest.Mock }
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Sentry = require('@sentry/node') as { captureException: jest.Mock }

// ── Parsed email helpers ──────────────────────────────────────────────────────

function makeDsnParsed(statusLine: string, recipient: string) {
  return {
    text: `This is the mail system at host mail.example.com.\n\nI'm sorry to have to inform you that your message could not\nbe delivered to one or more recipients.\n\nFinal-Recipient: rfc822; ${recipient}\nStatus: ${statusLine}\nAction: failed\n`,
  }
}

function makeArfParsed(originalRcpt: string) {
  return {
    text: `This is an email abuse report for an email message received from IP x.x.x.x on date.\n\nFeedback-Type: abuse\nOriginal-Rcpt-To: ${originalRcpt}\n`,
  }
}

function makeMsg(toAddress: string): FetchMessageObject {
  return {
    seq: 1,
    source: Buffer.from(''),
    uid: 1,
    flags: new Set<string>(),
    envelope: { to: [{ address: toAddress }] },
  } as FetchMessageObject
}

// ── Tests ─────────────────────────────────────────────────────────────────────

type ServicePrivateOverrides = {
  _processDsn: (msg: FetchMessageObject) => Promise<boolean>
  _processArf: (msg: FetchMessageObject) => Promise<boolean>
  _updateParticipant: (args: {
    email: string
    surveyId: string | null
    projectId: string | null
    bounceType?: 'hardBounce' | 'softBounce'
    complaintAt?: Date
  }) => Promise<void>
  _processMailbox: (args: {
    host: string
    port: number
    user: string
    pass: string
    caCert: string | null
    type: 'bounce' | 'abuse'
  }) => Promise<{ processed: number; errors: number }>
  logger: { log: jest.Mock }
  config: unknown
}

const withPrivates = (service: ServiceEmailBounceProcessor) =>
  asPrivate<ServiceEmailBounceProcessor, ServicePrivateOverrides>(service)

const HARD_BOUNCE_EXPIRY_DAYS = 30
const SOFT_BOUNCE_EXPIRY_DAYS = 2

describe('ServiceEmailBounceProcessor', () => {
  let service: ServiceEmailBounceProcessor
  let mockSuppression: {
    findOne: jest.Mock
    insertOne: jest.Mock
    updateOne: jest.Mock
  }
  let mockParticipant: { findOne: jest.Mock; updateOne: jest.Mock }

  beforeEach(() => {
    jest.clearAllMocks()

    service = new ServiceEmailBounceProcessor()
    withPrivates(service).logger = { log: jest.fn() }
    withPrivates(service).config = {
      model: {
        app: {
          emailSuppression: {
            hardBounceExpiryDays: HARD_BOUNCE_EXPIRY_DAYS,
            softBounceExpiryDays: SOFT_BOUNCE_EXPIRY_DAYS,
          },
        },
      },
    }

    mockSuppression = {
      findOne: jest.fn().mockResolvedValue(null),
      insertOne: jest.fn().mockResolvedValue(undefined),
      updateOne: jest.fn().mockResolvedValue(undefined),
    }

    mockParticipant = {
      findOne: jest.fn().mockResolvedValue(null),
      updateOne: jest.fn().mockResolvedValue(undefined),
    }

    jest.spyOn(service, 'getRepo').mockImplementation(((name: string) => {
      if (name === 'emailSuppression') return mockSuppression
      if (name === 'surveyParticipant') return mockParticipant
      return {}
    }) as typeof service.getRepo)
  })

  // ── run() ──────────────────────────────────────────────────────────────────

  describe('run()', () => {
    test('returns zeros without connecting when IMAP host is not configured', async () => {
      withPrivates(service).config = {
        model: { app: { mail: { imap: { host: null } } } },
      }

      const result = await service.run()

      expect(result).toEqual({ bounces: 0, complaints: 0, errors: 0 })
    })
  })

  // ── _processDsn() ──────────────────────────────────────────────────────────

  describe('_processDsn()', () => {
    test('hard bounce (5.x.x) — inserts suppression and updates participant', async () => {
      simpleParser.mockResolvedValue(
        makeDsnParsed('5.1.1', 'recipient@example.com'),
      )
      mockParticipant.findOne.mockResolvedValue({ _id: 'participant-1' })
      const msg = makeMsg('bounces+proj123-surv456@mail.veysur.com')

      const result = await withPrivates(service)._processDsn(msg)

      expect(result).toBe(true)
      expect(mockSuppression.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'recipient@example.com',
          reason: 'hardBounce',
          hardBounceEvents: [
            expect.objectContaining({
              projectId: 'proj123',
              surveyId: 'surv456',
              participantId: 'participant-1',
            }),
          ],
        }),
      )
      const [insertArgs] = mockSuppression.insertOne.mock.calls[0]
      const expectedExpiry =
        Date.now() + HARD_BOUNCE_EXPIRY_DAYS * 24 * 60 * 60 * 1000
      expect(insertArgs.expiresAt.getTime()).toBeCloseTo(expectedExpiry, -3)

      expect(mockParticipant.updateOne).toHaveBeenCalledWith(
        { surveyId: 'surv456', email: 'recipient@example.com' },
        expect.objectContaining({
          $set: expect.objectContaining({
            bounceType: 'hardBounce',
            emailStatus: 'invalid',
          }),
        }),
        expect.anything(),
      )
    })

    test('soft bounce (4.x.x) — inserts suppression with reason softBounce, emailStatus untouched', async () => {
      simpleParser.mockResolvedValue(
        makeDsnParsed('4.2.2', 'recipient@example.com'),
      )
      const msg = makeMsg('bounces+proj123-surv456@mail.veysur.com')

      const result = await withPrivates(service)._processDsn(msg)

      expect(result).toBe(true)
      expect(mockSuppression.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'softBounce' }),
      )
      const [insertArgs] = mockSuppression.insertOne.mock.calls[0]
      const expectedExpiry =
        Date.now() + SOFT_BOUNCE_EXPIRY_DAYS * 24 * 60 * 60 * 1000
      expect(insertArgs.expiresAt.getTime()).toBeCloseTo(expectedExpiry, -3)

      expect(mockParticipant.updateOne).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          $set: expect.not.objectContaining({ emailStatus: 'invalid' }),
        }),
        expect.anything(),
      )
    })

    test('no VERP in envelope — creates suppression but skips participant update', async () => {
      simpleParser.mockResolvedValue(
        makeDsnParsed('5.1.1', 'noverp@example.com'),
      )
      const msg = makeMsg('bounces@mail.veysur.com')

      const result = await withPrivates(service)._processDsn(msg)

      expect(result).toBe(true)
      expect(mockSuppression.insertOne).toHaveBeenCalled()
      expect(mockParticipant.updateOne).not.toHaveBeenCalled()
    })

    test('no delivery-status fields in text — returns false without any repo calls', async () => {
      simpleParser.mockResolvedValue({
        text: 'This is an unrelated notification with no DSN fields.',
      })
      const msg = makeMsg('bounces@mail.veysur.com')

      const result = await withPrivates(service)._processDsn(msg)

      expect(result).toBe(false)
      expect(mockSuppression.insertOne).not.toHaveBeenCalled()
      expect(mockParticipant.updateOne).not.toHaveBeenCalled()
    })

    test('repeated events push onto the matching array and cap at 10, newest first', async () => {
      simpleParser.mockResolvedValue(
        makeDsnParsed('5.1.1', 'recipient@example.com'),
      )
      mockSuppression.findOne.mockResolvedValue({ _id: 'existing-1' })
      const msg = makeMsg('bounces+proj123-surv456@mail.veysur.com')

      await withPrivates(service)._processDsn(msg)

      expect(mockSuppression.updateOne).toHaveBeenCalledWith(
        { email: 'recipient@example.com' },
        expect.objectContaining({
          $set: expect.objectContaining({ reason: 'hardBounce' }),
          $push: {
            hardBounceEvents: expect.objectContaining({
              $each: [expect.objectContaining({ projectId: 'proj123' })],
              $position: 0,
              $slice: 10,
            }),
          },
        }),
      )
    })

    test('a second hard bounce after the first suppression has expired re-extends expiresAt on the same document', async () => {
      // existing document's prior expiresAt has already lapsed
      mockSuppression.findOne.mockResolvedValue({
        _id: 'existing-1',
        email: 'recipient@example.com',
        reason: 'hardBounce',
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        hardBounceEvents: [],
        softBounceEvents: [],
        complaintEvents: [],
        unsubscribeEvents: [],
      })
      simpleParser.mockResolvedValue(
        makeDsnParsed('5.1.1', 'recipient@example.com'),
      )

      await withPrivates(service)._processDsn(
        makeMsg('bounces+proj123-surv456@mail.veysur.com'),
      )

      // updateOne against the existing document's unique-email key, not a
      // fresh insertOne — same suppression record, expiresAt re-extended
      expect(mockSuppression.insertOne).not.toHaveBeenCalled()
      expect(mockSuppression.updateOne).toHaveBeenCalledWith(
        { email: 'recipient@example.com' },
        expect.objectContaining({
          $set: expect.objectContaining({
            reason: 'hardBounce',
            expiresAt: expect.any(Date),
          }),
        }),
      )
      const [, updateArgs] = mockSuppression.updateOne.mock.calls[0]
      const expectedExpiry =
        Date.now() + HARD_BOUNCE_EXPIRY_DAYS * 24 * 60 * 60 * 1000
      expect(updateArgs.$set.expiresAt.getTime()).toBeCloseTo(
        expectedExpiry,
        -3,
      )
      expect(updateArgs.$set.expiresAt.getTime()).toBeGreaterThan(Date.now())
    })

    test('complaint and hard-bounce events accumulate in independent arrays', async () => {
      mockSuppression.findOne.mockResolvedValue({ _id: 'existing-1' })

      simpleParser.mockResolvedValue(
        makeDsnParsed('5.1.1', 'recipient@example.com'),
      )
      await withPrivates(service)._processDsn(
        makeMsg('bounces+proj123-surv456@mail.veysur.com'),
      )
      expect(mockSuppression.updateOne).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({
          $push: expect.objectContaining({
            hardBounceEvents: expect.anything(),
          }),
        }),
      )

      simpleParser.mockResolvedValue(makeArfParsed('recipient@example.com'))
      await withPrivates(service)._processArf(
        makeMsg('bounces+proj123-surv456@mail.veysur.com'),
      )
      expect(mockSuppression.updateOne).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({
          $push: expect.objectContaining({
            complaintEvents: expect.anything(),
          }),
        }),
      )
    })

    test('second event for the same email but a different projectId is still recorded', async () => {
      mockSuppression.findOne.mockResolvedValue({ _id: 'existing-1' })
      simpleParser.mockResolvedValue(
        makeDsnParsed('5.1.1', 'recipient@example.com'),
      )

      await withPrivates(service)._processDsn(
        makeMsg('bounces+projA-survA@mail.veysur.com'),
      )
      expect(mockSuppression.updateOne).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({
          $push: {
            hardBounceEvents: expect.objectContaining({
              $each: [expect.objectContaining({ projectId: 'projA' })],
            }),
          },
        }),
      )

      await withPrivates(service)._processDsn(
        makeMsg('bounces+projB-survB@mail.veysur.com'),
      )
      expect(mockSuppression.updateOne).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({
          $push: {
            hardBounceEvents: expect.objectContaining({
              $each: [expect.objectContaining({ projectId: 'projB' })],
            }),
          },
        }),
      )
    })
  })

  // ── soft bounce retry cooldown ──────────────────────────────────────────────

  describe('soft bounce retry cooldown', () => {
    test('1st and 2nd consecutive soft bounces stay soft, participant emailStatus untouched', async () => {
      simpleParser.mockResolvedValue(
        makeDsnParsed('4.2.2', 'recipient@example.com'),
      )
      const msg = makeMsg('bounces+proj123-surv456@mail.veysur.com')

      // 1st soft bounce — no existing record
      mockSuppression.findOne.mockResolvedValueOnce(null)
      await withPrivates(service)._processDsn(msg)

      expect(mockSuppression.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: 'softBounce',
          softBounceEvents: [expect.objectContaining({ projectId: 'proj123' })],
        }),
      )
      let expectedExpiry =
        Date.now() + SOFT_BOUNCE_EXPIRY_DAYS * 24 * 60 * 60 * 1000
      expect(
        mockSuppression.insertOne.mock.calls[0][0].expiresAt.getTime(),
      ).toBeCloseTo(expectedExpiry, -3)

      // 2nd soft bounce — existing record with 1 prior soft bounce event
      mockSuppression.findOne.mockResolvedValueOnce({
        softBounceEvents: [{ occurredAt: new Date() }],
      })
      await withPrivates(service)._processDsn(msg)

      expect(mockSuppression.updateOne).toHaveBeenLastCalledWith(
        { email: 'recipient@example.com' },
        expect.objectContaining({
          $set: expect.objectContaining({ reason: 'softBounce' }),
          $push: {
            softBounceEvents: expect.objectContaining({
              $each: [expect.objectContaining({ projectId: 'proj123' })],
              $position: 0,
              $slice: 10,
            }),
          },
        }),
      )
      const lastUpdateCall =
        mockSuppression.updateOne.mock.calls[
          mockSuppression.updateOne.mock.calls.length - 1
        ]
      const [, lastUpdateArgs] = lastUpdateCall
      expectedExpiry =
        Date.now() + SOFT_BOUNCE_EXPIRY_DAYS * 24 * 60 * 60 * 1000
      expect(lastUpdateArgs.$set.expiresAt.getTime()).toBeCloseTo(
        expectedExpiry,
        -3,
      )
      expect(lastUpdateArgs.$set.softBounceEvents).toBeUndefined()

      expect(mockParticipant.updateOne).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({
          $set: expect.objectContaining({ bounceType: 'softBounce' }),
        }),
        expect.anything(),
      )
      const lastParticipantUpdateCall =
        mockParticipant.updateOne.mock.calls[
          mockParticipant.updateOne.mock.calls.length - 1
        ]
      expect(lastParticipantUpdateCall[1].$set).not.toHaveProperty(
        'emailStatus',
      )
    })

    test('5th consecutive soft bounce still stays soft — no escalation to hard bounce', async () => {
      simpleParser.mockResolvedValue(
        makeDsnParsed('4.2.2', 'recipient@example.com'),
      )
      mockParticipant.findOne.mockResolvedValue({ _id: 'participant-1' })
      const msg = makeMsg('bounces+proj123-surv456@mail.veysur.com')

      // Existing record already has 4 prior soft bounce events
      mockSuppression.findOne.mockResolvedValue({
        softBounceEvents: [
          { occurredAt: new Date() },
          { occurredAt: new Date() },
          { occurredAt: new Date() },
          { occurredAt: new Date() },
        ],
      })

      await withPrivates(service)._processDsn(msg)

      expect(mockSuppression.updateOne).toHaveBeenCalledWith(
        { email: 'recipient@example.com' },
        expect.objectContaining({
          $set: expect.objectContaining({ reason: 'softBounce' }),
          $push: {
            softBounceEvents: expect.objectContaining({
              $each: [expect.objectContaining({ projectId: 'proj123' })],
              $position: 0,
              $slice: 10,
            }),
          },
        }),
      )
      const [, updateArgs] =
        mockSuppression.updateOne.mock.calls[
          mockSuppression.updateOne.mock.calls.length - 1
        ]
      const expectedExpiry =
        Date.now() + SOFT_BOUNCE_EXPIRY_DAYS * 24 * 60 * 60 * 1000
      expect(updateArgs.$set.expiresAt.getTime()).toBeCloseTo(
        expectedExpiry,
        -3,
      )

      expect(mockParticipant.updateOne).toHaveBeenCalledWith(
        { surveyId: 'surv456', email: 'recipient@example.com' },
        expect.objectContaining({
          $set: expect.objectContaining({ bounceType: 'softBounce' }),
        }),
        expect.anything(),
      )
      const [, participantUpdateArgs] =
        mockParticipant.updateOne.mock.calls[
          mockParticipant.updateOne.mock.calls.length - 1
        ]
      expect(participantUpdateArgs.$set).not.toHaveProperty('emailStatus')
    })

    test('soft bounce expiresAt is 48 hours out under the default config', async () => {
      simpleParser.mockResolvedValue(
        makeDsnParsed('4.2.2', 'recipient@example.com'),
      )
      mockSuppression.findOne.mockResolvedValue(null)
      const msg = makeMsg('bounces+proj123-surv456@mail.veysur.com')

      await withPrivates(service)._processDsn(msg)

      const [insertArgs] = mockSuppression.insertOne.mock.calls[0]
      expect(SOFT_BOUNCE_EXPIRY_DAYS * 24).toBe(48)
      const expectedExpiry = Date.now() + 48 * 60 * 60 * 1000
      expect(insertArgs.expiresAt.getTime()).toBeCloseTo(expectedExpiry, -3)
    })

    test('a hard bounce still resets any in-progress soft-bounce history', async () => {
      // A soft-bounce streak of 2 is already in progress
      mockSuppression.findOne.mockResolvedValue({
        softBounceEvents: [
          { occurredAt: new Date() },
          { occurredAt: new Date() },
        ],
      })

      // A hard bounce arrives for the same address, clearing softBounceEvents
      simpleParser.mockResolvedValue(
        makeDsnParsed('5.1.1', 'recipient@example.com'),
      )
      await withPrivates(service)._processDsn(
        makeMsg('bounces+proj123-surv456@mail.veysur.com'),
      )
      expect(mockSuppression.updateOne).toHaveBeenLastCalledWith(
        { email: 'recipient@example.com' },
        expect.objectContaining({
          $set: expect.objectContaining({
            reason: 'hardBounce',
            softBounceEvents: [],
          }),
        }),
      )
    })
  })

  // ── _processArf() ──────────────────────────────────────────────────────────

  describe('_processArf()', () => {
    test('valid ARF — inserts suppression with reason complaint, expiresAt null', async () => {
      simpleParser.mockResolvedValue(makeArfParsed('complainer@example.com'))
      const msg = makeMsg('abuse@mail.veysur.com')

      const result = await withPrivates(service)._processArf(msg)

      expect(result).toBe(true)
      expect(mockSuppression.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'complainer@example.com',
          reason: 'complaint',
          expiresAt: null,
        }),
      )
    })

    test('complaint sets participant emailStatus to invalid', async () => {
      simpleParser.mockResolvedValue(makeArfParsed('complainer@example.com'))
      mockParticipant.findOne.mockResolvedValue({ _id: 'participant-1' })
      const msg = makeMsg('bounces+proj123-surv456@mail.veysur.com')

      await withPrivates(service)._processArf(msg)

      expect(mockParticipant.updateOne).toHaveBeenCalledWith(
        { surveyId: 'surv456', email: 'complainer@example.com' },
        expect.objectContaining({
          $set: expect.objectContaining({ emailStatus: 'invalid' }),
        }),
        expect.anything(),
      )
    })

    test('no feedback-report fields in text — returns false without any repo calls', async () => {
      simpleParser.mockResolvedValue({
        text: 'This is an unrelated notification with no ARF fields.',
      })
      const msg = makeMsg('abuse@mail.veysur.com')

      const result = await withPrivates(service)._processArf(msg)

      expect(result).toBe(false)
      expect(mockSuppression.insertOne).not.toHaveBeenCalled()
    })
  })

  // ── real mailparser integration ─────────────────────────────────────────────

  describe('_processDsn() — real mailparser integration', () => {
    // mailparser's stream-based parsing relies on real Node timers;
    // this suite runs under globally-enabled fake timers, so this one
    // test needs real timers for the real (unmocked) simpleParser to resolve.
    beforeEach(() => jest.useRealTimers())
    afterEach(() => jest.useFakeTimers())

    test('parses a realistic raw Postfix multipart/report DSN end-to-end', async () => {
      const { simpleParser: realSimpleParser } =
        jest.requireActual('mailparser')
      simpleParser.mockImplementation(realSimpleParser)

      mockParticipant.findOne.mockResolvedValue({ _id: 'participant-1' })

      const rawDsn = [
        'From: Mail Delivery System <MAILER-DAEMON@mail.veysur.com>',
        'To: bounces+proj123-surv456@mail.veysur.com',
        'Subject: Undelivered Mail Returned to Sender',
        'MIME-Version: 1.0',
        'Content-Type: multipart/report; report-type=delivery-status;',
        '  boundary="BOUNDARY"',
        '',
        'This is a MIME-encapsulated message.',
        '',
        '--BOUNDARY',
        'Content-Description: Notification',
        'Content-Type: text/plain; charset=us-ascii',
        '',
        'This is the mail system at host mail.veysur.com.',
        '',
        "I'm sorry to have to inform you that your message could not",
        'be delivered to one or more recipients.',
        '',
        '<recipient@example.com>: Domain example.com does not accept mail (nullMX)',
        '',
        '--BOUNDARY',
        'Content-Description: Delivery report',
        'Content-Type: message/delivery-status',
        '',
        'Reporting-MTA: dns; mail.veysur.com',
        'Arrival-Date: Wed, 29 Jul 2026 18:42:13 +0000 (UTC)',
        '',
        'Final-Recipient: rfc822; recipient@example.com',
        'Original-Recipient: rfc822;recipient@example.com',
        'Action: failed',
        'Status: 5.1.0',
        'Diagnostic-Code: X-Postfix; Domain example.com does not accept mail (nullMX)',
        '',
        '--BOUNDARY',
        'Content-Description: Undelivered Message',
        'Content-Type: message/rfc822',
        '',
        'From: VeySur <noreply@mail.veysur.com>',
        'To: recipient@example.com',
        'Subject: You are invited',
        '',
        'Body text.',
        '',
        '--BOUNDARY--',
        '',
      ].join('\r\n')

      const msg = {
        seq: 1,
        source: Buffer.from(rawDsn),
        uid: 1,
        flags: new Set<string>(),
        envelope: {
          to: [{ address: 'bounces+proj123-surv456@mail.veysur.com' }],
        },
      } as FetchMessageObject

      const result = await withPrivates(service)._processDsn(msg)

      expect(result).toBe(true)
      expect(mockSuppression.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'recipient@example.com',
          reason: 'hardBounce',
        }),
      )
      expect(mockParticipant.updateOne).toHaveBeenCalledWith(
        { surveyId: 'surv456', email: 'recipient@example.com' },
        expect.objectContaining({
          $set: expect.objectContaining({
            bounceType: 'hardBounce',
            emailStatus: 'invalid',
          }),
        }),
        expect.anything(),
      )
    })
  })

  // ── _processMailbox() ────────────────────────────────────────────────────────

  describe('_processMailbox()', () => {
    test('marks Seen only messages that were handled (processed or not-a-report); leaves errored messages unseen', async () => {
      const processedMsg = makeMsg('bounces+proj123-surv456@mail.veysur.com')
      processedMsg.uid = 101
      const notAReportMsg = makeMsg('bounces@mail.veysur.com')
      notAReportMsg.uid = 102
      const erroredMsg = makeMsg('bounces+proj123-surv456@mail.veysur.com')
      erroredMsg.uid = 103

      simpleParser.mockImplementation(async (source: Buffer) => {
        const label = source.toString('utf8')
        if (label === 'processed')
          return makeDsnParsed('5.1.1', 'recipient@example.com')
        if (label === 'not-a-report') return { text: 'unrelated notification' }
        throw new Error('parse failure')
      })
      processedMsg.source = Buffer.from('processed')
      notAReportMsg.source = Buffer.from('not-a-report')
      erroredMsg.source = Buffer.from('errored')

      const messageFlagsAdd = jest.fn().mockResolvedValue(undefined)
      const mockImapClient = {
        connect: jest.fn().mockResolvedValue(undefined),
        getMailboxLock: jest.fn().mockResolvedValue({ release: jest.fn() }),
        fetch: jest.fn().mockImplementation(async function* () {
          yield processedMsg
          yield notAReportMsg
          yield erroredMsg
        }),
        messageFlagsAdd,
        logout: jest.fn().mockResolvedValue(undefined),
      }

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ImapFlow } = require('imapflow') as {
        ImapFlow: jest.Mock
      }
      ImapFlow.mockImplementation(() => mockImapClient)

      const result = await withPrivates(service)._processMailbox({
        host: 'mail.veysur.com',
        port: 993,
        user: 'bounces',
        pass: 'secret',
        caCert: null,
        type: 'bounce',
      })

      expect(result).toEqual({ processed: 1, errors: 1 })
      expect(messageFlagsAdd).toHaveBeenCalledWith('101,102', ['\\Seen'], {
        uid: true,
      })
    })

    test('constructs ImapFlow with connection/greeting/socket timeouts so a black-holed relay cannot hang', async () => {
      const mockImapClient = {
        connect: jest.fn().mockResolvedValue(undefined),
        getMailboxLock: jest.fn().mockResolvedValue({ release: jest.fn() }),
        fetch: jest.fn().mockImplementation(async function* () {}),
        messageFlagsAdd: jest.fn().mockResolvedValue(undefined),
        logout: jest.fn().mockResolvedValue(undefined),
      }

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ImapFlow } = require('imapflow') as { ImapFlow: jest.Mock }
      ImapFlow.mockImplementation(() => mockImapClient)

      await withPrivates(service)._processMailbox({
        host: 'mail.veysur.com',
        port: 993,
        user: 'bounces',
        pass: 'secret',
        caCert: null,
        type: 'bounce',
      })

      expect(ImapFlow).toHaveBeenCalledWith(
        expect.objectContaining({
          connectionTimeout: expect.any(Number),
          greetingTimeout: expect.any(Number),
          socketTimeout: expect.any(Number),
        }),
      )
      expect(mockImapClient.getMailboxLock).toHaveBeenCalledWith(
        'INBOX',
        expect.objectContaining({ acquireTimeout: expect.any(Number) }),
      )
    })

    test('surfaces the IMAP connection error as an errors count instead of swallowing it', async () => {
      const connectError = new Error('ETIMEDOUT')
      const mockImapClient = {
        connect: jest.fn().mockRejectedValue(connectError),
        getMailboxLock: jest.fn(),
        fetch: jest.fn(),
        messageFlagsAdd: jest.fn(),
        logout: jest.fn().mockResolvedValue(undefined),
      }

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ImapFlow } = require('imapflow') as { ImapFlow: jest.Mock }
      ImapFlow.mockImplementation(() => mockImapClient)

      const result = await withPrivates(service)._processMailbox({
        host: 'mail.veysur.com',
        port: 993,
        user: 'bounces',
        pass: 'secret',
        caCert: null,
        type: 'bounce',
      })

      expect(result).toEqual({ processed: 0, errors: 1 })
      // The non-zero errors count drives ServiceTaskManager's soft-failure path,
      // which escalates after two consecutive failures — the processor no longer
      // captures directly on a single failed run.
      expect(Sentry.captureException).not.toHaveBeenCalledWith(connectError)
    })
  })

  describe('_lookupParticipantId() — orphaned project datasource', () => {
    test('captures once and continues when the project datasource no longer exists', async () => {
      const msg = makeMsg('bounces+proj123-surv456@mail.veysur.com')
      simpleParser.mockResolvedValue(
        makeDsnParsed('5.1.1', 'recipient@example.com'),
      )
      const orphanError = new Error(
        'No datasource configuration found for datasource "project" with key: proj123',
      )
      mockParticipant.findOne.mockRejectedValue(orphanError)
      mockParticipant.updateOne.mockRejectedValue(orphanError)

      const handled = await withPrivates(service)._processDsn(msg)

      expect(handled).toBe(true)
      expect(Sentry.captureException).toHaveBeenCalledWith(orphanError)
      expect(mockSuppression.insertOne).toHaveBeenCalled()
    })

    test('_updateParticipant swallows the orphaned-project error instead of throwing', async () => {
      const orphanError = new Error(
        'No datasource configuration found for datasource "project" with key: proj123',
      )
      mockParticipant.updateOne.mockRejectedValue(orphanError)

      await expect(
        withPrivates(service)._updateParticipant({
          email: 'recipient@example.com',
          surveyId: 'surv456',
          projectId: 'proj123',
          bounceType: 'hardBounce',
        }),
      ).resolves.toBeUndefined()

      expect(Sentry.captureException).toHaveBeenCalledWith(orphanError)
    })
  })
})
