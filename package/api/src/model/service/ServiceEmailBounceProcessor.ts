// cspell:ignore VERP Verp Rcpt
import tls from 'node:tls'
import { Service } from '@datacapy/server'
import { ImapFlow, FetchMessageObject } from 'imapflow'
import { simpleParser } from 'mailparser'
import { DataSourceContext } from '@datacapy/om'
import { genUniqueId } from '@datacapy/id'
import { RepoEmailSuppression, RepoSurveyParticipant } from 'model/repo'
import { captureWithFingerprint } from 'common'

const VERP_PATTERN = /bounces\+([^-@]+)-([^@]+)@/

export class ServiceEmailBounceProcessor extends Service {
  constructor() {
    super({ name: 'emailBounceProcessor' })
  }

  async run(): Promise<{
    bounces: number
    complaints: number
    errors: number
  }> {
    const imapConfig = this.config.model.app.mail.imap
    if (!imapConfig?.host) {
      this.logger.log('[BounceProcessor] IMAP not configured, skipping')
      return { bounces: 0, complaints: 0, errors: 0 }
    }

    let errors = 0

    const bounceResults = await this._processMailbox({
      host: imapConfig.host,
      port: imapConfig.port,
      user: imapConfig.bounce.user,
      pass: imapConfig.bounce.pass,
      caCert: imapConfig.caCert,
      type: 'bounce',
    })
    const bounces = bounceResults.processed
    errors += bounceResults.errors

    const abuseResults = await this._processMailbox({
      host: imapConfig.host,
      port: imapConfig.port,
      user: imapConfig.abuse.user,
      pass: imapConfig.abuse.pass,
      caCert: imapConfig.caCert,
      type: 'abuse',
    })
    const complaints = abuseResults.processed
    errors += abuseResults.errors

    this.logger.log(
      `[BounceProcessor] Complete: ${bounces} bounces, ${complaints} complaints, ${errors} errors`,
    )

    return { bounces, complaints, errors }
  }

  private async _processMailbox({
    host,
    port,
    user,
    pass,
    caCert,
    type,
  }: {
    host: string
    port: number
    user: string
    pass: string
    caCert: string | null
    type: 'bounce' | 'abuse'
  }): Promise<{ processed: number; errors: number }> {
    if (!user || !pass) {
      this.logger.log(`[BounceProcessor] IMAP ${type} mailbox not configured`)
      return { processed: 0, errors: 0 }
    }

    const client = new ImapFlow({
      host,
      port,
      secure: port === 993,
      auth: { user, pass },
      logger: false,
      // Without these, a black-holed relay hangs until the task-manager kills the
      // execution at the 10-minute task limit (and starves the single execution slot).
      connectionTimeout: 20_000,
      greetingTimeout: 10_000,
      socketTimeout: 30_000,
      ...(caCert
        ? {
            tls: {
              ca: [Buffer.from(caCert, 'base64').toString('utf8')],
              checkServerIdentity: (
                _hostname: string,
                cert: tls.PeerCertificate,
              ) => tls.checkServerIdentity(host, cert),
            },
          }
        : {}),
    })

    let processed = 0
    let errors = 0

    try {
      await client.connect()
      const lock = await client.getMailboxLock('INBOX', {
        acquireTimeout: 30_000,
      })

      try {
        const uidsToMarkSeen: number[] = []
        for await (const msg of client.fetch(
          '1:*',
          {
            flags: true,
            source: true,
            envelope: true,
          },
          { uid: true },
        )) {
          if (msg.flags.has('\\Seen')) continue

          try {
            const handled =
              type === 'bounce'
                ? await this._processDsn(msg)
                : await this._processArf(msg)

            if (handled) {
              processed++
            } else {
              this.logger.log(
                `[BounceProcessor] uid=${msg.uid} did not match a recognized ${type === 'bounce' ? 'DSN' : 'ARF'} report — marking seen`,
              )
            }
            uidsToMarkSeen.push(msg.uid)
          } catch (err) {
            this.logger.log(
              `[BounceProcessor] Error processing message uid=${msg.uid}: ${err instanceof Error ? err.message : String(err)}`,
            )
            errors++
          }
        }

        if (uidsToMarkSeen.length > 0) {
          await client.messageFlagsAdd(uidsToMarkSeen.join(','), ['\\Seen'], {
            uid: true,
          })
        }
      } finally {
        lock.release()
      }
    } catch (err) {
      const responseText =
        err instanceof Error && 'responseText' in err
          ? String((err as { responseText: unknown }).responseText)
          : undefined
      this.logger.log(
        `[BounceProcessor] IMAP connection error (${type}): ${err instanceof Error ? err.message : String(err)}${responseText ? ` (${responseText})` : ''}`,
      )
      // This path swallowed every IMAP failure silently — prod bounce processing
      // was dead for 9 days before anyone noticed. The non-zero `errors` count
      // below makes ServiceTaskManager record the run as a failure; it escalates
      // to BugSink once the task has failed twice in a row (a single transient
      // IMAP blip during a deploy is not alerted).
      errors++
    } finally {
      await client.logout().catch(() => {})
    }

    return { processed, errors }
  }

  private async _processDsn(msg: FetchMessageObject): Promise<boolean> {
    const parsed = await simpleParser(msg.source)

    // mailparser folds a real Postfix multipart/report DSN's
    // message/delivery-status part into `parsed.text` rather than
    // `parsed.attachments` — extract directly from the text body.
    const text = parsed.text ?? ''
    const finalRecipient = this._extractHeader(text, 'Final-Recipient')
    const status = this._extractHeader(text, 'Status')

    if (!finalRecipient || !status) return false

    const email = finalRecipient
      .replace(/^rfc822;\s*/i, '')
      .trim()
      .toLowerCase()
    if (!email) return false

    const firstDigit = parseInt(status.charAt(0), 10)
    const bounceType = firstDigit >= 5 ? 'hardBounce' : 'softBounce'

    const { projectId, surveyId } = this._parseVerp(msg)
    const participantId = await this._lookupParticipantId({
      email,
      surveyId,
      projectId,
    })

    await this._recordSuppression({
      email,
      reason: bounceType,
      projectId,
      surveyId,
      participantId,
    })
    await this._updateParticipant({
      email,
      surveyId,
      projectId,
      bounceType,
    })

    return true
  }

  private async _processArf(msg: FetchMessageObject): Promise<boolean> {
    const parsed = await simpleParser(msg.source)

    // mailparser folds a real multipart/report ARF's message/feedback-report
    // part into `parsed.text` rather than `parsed.attachments` — extract
    // directly from the text body, same as _processDsn.
    const text = parsed.text ?? ''
    const originalRcpt =
      this._extractHeader(text, 'Original-Rcpt-To') ||
      this._extractHeader(text, 'Original-Mail-From')

    if (!originalRcpt) return false

    const email = originalRcpt
      .replace(/^rfc822;\s*/i, '')
      .trim()
      .toLowerCase()
    if (!email) return false

    const { projectId, surveyId } = this._parseVerp(msg)
    const participantId = await this._lookupParticipantId({
      email,
      surveyId,
      projectId,
    })

    await this._recordSuppression({
      email,
      reason: 'complaint',
      projectId,
      surveyId,
      participantId,
    })
    await this._updateParticipant({
      email,
      surveyId,
      projectId,
      complaintAt: new Date(),
    })

    return true
  }

  private _parseVerp(msg: FetchMessageObject): {
    projectId: string | null
    surveyId: string | null
  } {
    const toAddresses: string[] = []

    if (msg.envelope?.to) {
      for (const addr of msg.envelope.to) {
        if (addr.address) toAddresses.push(addr.address)
      }
    }

    for (const addr of toAddresses) {
      const match = addr.match(VERP_PATTERN)
      if (match) {
        return { projectId: match[1], surveyId: match[2] }
      }
    }

    return { projectId: null, surveyId: null }
  }

  private async _lookupParticipantId({
    email,
    surveyId,
    projectId,
  }: {
    email: string
    surveyId: string | null
    projectId: string | null
  }): Promise<string | null> {
    if (!surveyId || !projectId) return null

    const repoSurveyParticipant =
      this.getRepo<RepoSurveyParticipant>('surveyParticipant')
    const context = DataSourceContext.fromDataSources({
      project: { lookupKey: projectId },
    })

    try {
      const participant = await repoSurveyParticipant.findOne(
        { surveyId, email },
        { context, skipValidation: true },
      )
      return participant?._id ?? null
    } catch (err) {
      if (this._handleOrphanedProjectError(err)) return null
      throw err
    }
  }

  // A bounce DSN can name a projectId whose project datasource no longer exists
  // (e.g. the project was deleted). @datacapy/om throws "No datasource configuration
  // found" — capture once under a stable fingerprint and carry on, rather than
  // aborting the whole mailbox pass. Returns true if the error was handled.
  private _handleOrphanedProjectError(err: unknown): boolean {
    if (
      err instanceof Error &&
      err.message.includes('No datasource configuration found')
    ) {
      captureWithFingerprint(['bounce-dsn-orphaned-project'], err)
      return true
    }
    return false
  }

  private _computeExpiresAt(
    reason: 'hardBounce' | 'softBounce' | 'complaint' | 'unsubscribe',
  ): Date | null {
    if (reason === 'hardBounce') {
      const days = this.config.model.app.emailSuppression.hardBounceExpiryDays
      return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    }
    if (reason === 'softBounce') {
      const days = this.config.model.app.emailSuppression.softBounceExpiryDays
      return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    }
    return null
  }

  private async _recordSuppression({
    email,
    reason,
    projectId,
    surveyId,
    participantId,
  }: {
    email: string
    reason: 'hardBounce' | 'softBounce' | 'complaint' | 'unsubscribe'
    projectId: string | null
    surveyId: string | null
    participantId: string | null
  }): Promise<void> {
    const repoEmailSuppression =
      this.getRepo<RepoEmailSuppression>('emailSuppression')

    const event = {
      occurredAt: new Date(),
      projectId,
      surveyId,
      participantId,
    }

    const existing = await repoEmailSuppression.findOne({ email })

    const eventField = `${reason}Events`
    const expiresAt = this._computeExpiresAt(reason)
    // A genuine hard bounce/complaint supersedes any soft-bounce history in
    // progress, so it shouldn't count towards a future soft-bounce streak.
    const resetsSoftBounceStreak =
      reason === 'hardBounce' || reason === 'complaint'

    if (existing) {
      await repoEmailSuppression.updateOne(
        { email },
        {
          $set: {
            reason,
            expiresAt,
            updatedAt: new Date(),
            ...(resetsSoftBounceStreak && { softBounceEvents: [] }),
          },
          $push: {
            [eventField]: { $each: [event], $position: 0, $slice: 10 },
          },
        },
      )
    } else {
      await repoEmailSuppression.insertOne({
        _id: genUniqueId(),
        email,
        reason,
        hardBounceEvents: [],
        softBounceEvents: [],
        complaintEvents: [],
        unsubscribeEvents: [],
        [eventField]: [event],
        expiresAt,
        participantId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }
  }

  private async _updateParticipant({
    email,
    surveyId,
    projectId,
    bounceType,
    complaintAt,
  }: {
    email: string
    surveyId: string | null
    projectId: string | null
    bounceType?: 'hardBounce' | 'softBounce'
    complaintAt?: Date
  }): Promise<void> {
    if (!surveyId || !projectId) return

    const repoSurveyParticipant =
      this.getRepo<RepoSurveyParticipant>('surveyParticipant')
    const context = DataSourceContext.fromDataSources({
      project: { lookupKey: projectId },
    })

    const update: Record<string, unknown> = { updatedAt: new Date() }
    if (bounceType) {
      update.bounceType = bounceType
      update.bounceAt = new Date()
    }
    if (complaintAt) {
      update.complaintAt = complaintAt
    }
    if (bounceType === 'hardBounce' || complaintAt) {
      update.emailStatus = 'invalid'
    }

    try {
      await repoSurveyParticipant.updateOne(
        { surveyId, email },
        { $set: update },
        { context, skipValidation: true },
      )
    } catch (err) {
      if (this._handleOrphanedProjectError(err)) return
      throw err
    }
  }

  private _extractHeader(text: string, name: string): string | null {
    const regex = new RegExp(`^${name}:\\s*(.+)$`, 'im')
    const match = text.match(regex)
    return match ? match[1].trim() : null
  }
}

export default ServiceEmailBounceProcessor
