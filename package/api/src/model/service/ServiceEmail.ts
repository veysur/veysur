// cspell:ignore ETIMEDOUT ECONNREFUSED ECONNRESET EAI ENOTFOUND ECONNECTION ESOCKET
import { Service, ServerErrorBadRequest } from 'mzen-server'
import { DataSourceContext } from 'mzen-om'
import momentTimezone from 'moment-timezone'
import * as nodemailer from 'nodemailer'
import { HtmlToText } from 'model/common'
import { captureWithFingerprint } from 'common'
import { RepoEmail, Email, RepoSurveyParticipant } from '../repo'

export interface FromAddress {
  name?: string | null
  email: string
}

export interface SendDirectOptions {
  to: string | FromAddress
  from: string | FromAddress
  subject?: string
  text?: string
  html?: string
  envelopeFrom?: string
}

/** Default per-project hourly send rate. Used as-is by the self-hosted deployment
 * (no per-project limits) and as the fallback when an extension supplies no rate
 * for a project - see docs/mail-queue-pacing.md. */
const FALLBACK_MAX_PER_HOUR = 150

export interface ProcessQueueResult {
  dispatched: number
  failed: number
  errors: Array<{ emailId: string; message: string }>
}

export class ServiceEmail extends Service {
  transporter: nodemailer.Transporter

  constructor() {
    super({ name: 'email' })
    this.transporter = null
  }

  /**
   * The project's hourly send rate. Core (self-hosted) has no per-project
   * limits, so it is the flat default. An extension overrides this to supply a
   * per-project rate. Extension seam.
   */
  protected async emailSendRatePerHour(_projectId: string): Promise<number> {
    return FALLBACK_MAX_PER_HOUR
  }

  async init() {
    super.init()

    if (!this.config.model.app.mail.logOnly) {
      const transportType = this.config.model.app.mail.transport.type
      const transportOpts = this.config.model.app.mail.transport[transportType]
      this.transporter = nodemailer.createTransport(transportOpts)
    }
  }

  /**
   * Insert a fully-resolved email as a pending queue row, to be dispatched later by
   * processQueue() once scheduledAt has passed. Callers must resolve subject/html/text
   * before calling this, exactly as they do today before calling send().
   */
  async enqueue(email: Email, scheduledAt: Date): Promise<Email> {
    const repoEmail = this.getRepo<RepoEmail>('email')

    email.status = 'pending'
    email.scheduledAt = scheduledAt
    email.attempts = 0
    if (!email.service) email.service = 'queued'

    // `from` is required by the schema. send() normally defaults it from
    // config.model.app.mail.sendOptions.from just before dispatch - enqueue() persists
    // before that point, so it must apply the same default here.
    if (!email.from) {
      const configuredFrom = this.config.model.app.mail.sendOptions?.from
      if (configuredFrom) {
        email.from =
          typeof configuredFrom === 'object'
            ? configuredFrom.email
            : configuredFrom
      }
    }

    await repoEmail.save(email)
    return email
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  async send(email: Email) {
    const repoEmail = this.getRepo<RepoEmail>('email')

    // Idempotency guard - processQueue() calls send() against an already-persisted
    // pending row; a row that somehow got dispatched twice should not re-send.
    if (email.status === 'sent') return

    const options = {
      to: undefined,
      from: undefined,
      ...this.config.model.app.mail.sendOptions,
    } as SendDirectOptions

    if (email.subject) options.subject = email.subject
    if (email.to) options.to = email.to
    if (email.from) options.from = email.from
    if (email.envelopeFrom) options['envelopeFrom'] = email.envelopeFrom

    if (!email.from && options.from) {
      email.from =
        typeof options.from === 'object' ? options.from.email : options.from
    }

    // Set html/text from email if provided
    if (email.html) {
      options.html = email.html
    }
    if (email.text) {
      options.text = email.text
    }

    // Only use internal template system if html/text not already provided
    if (!email.html || !email.text) {
      const template = email.template ? email.template : email.type
      const templateData = email.templateData ? email.templateData : {}

      if (template) {
        email.template = template
        // Set default template variables
        if (!templateData.companyName && this.config.model.app.companyName) {
          templateData.companyName = this.config.model.app.companyName
        }
        if (!templateData.webDomain && this.config.model.app.webDomain) {
          templateData.webDomain = this.config.model.app.webDomain
        }
        if (!templateData.logoUrl && this.config.model.app.webDomain) {
          templateData.logoUrl = `https://${this.config.model.app.webDomain}/image/veysur-logo-light.png`
        }
        if (!templateData.currentYear) {
          templateData.currentYear = new Date().getFullYear()
        }

        // Only generate HTML from template if not already provided
        if (!email.html) {
          const templateHtml =
            this.config.model.app.asset?.html?.email[template]
          const html = templateHtml ? templateHtml(templateData) : null
          if (html) {
            email.html = html
            options.html = html
          }
        }

        // Only generate text from template if not already provided
        if (!email.text) {
          const templateText =
            this.config.model.app.asset?.html?.email[template + '-text']
          const text = templateText ? templateText(templateData) : null
          if (text) {
            email.text = text
            options.text = text
          }
        }
      }
    }

    // Generate text from HTML if text is still missing but HTML exists
    // This is the fallback when no -text template exists
    if (!email.text && email.html) {
      const text = HtmlToText.convert(email.html)
      if (text) {
        email.text = text
        options.text = text
      }
    }

    // For test environments we only log the email
    email.attempts = email.attempts ? email.attempts + 1 : 1
    try {
      if (this.config.model.app.mail.logOnly) {
        email.service = 'logger'
        email.messageId = 'test-' + Date.now()
        email.sent = new Date()
        email.status = 'sent'
        await repoEmail.save(email)
      } else {
        email.service = this.config.model.app.mail.transport.type
        const response = await this.sendDirect(options)
        email.messageId = response.messageId
        email.sent = new Date()
        email.status = 'sent'
        await repoEmail.save(email)
      }
    } catch (error) {
      email.error = error.message
      email.status = 'error'
      await repoEmail.save(email)
      throw error
    }
  }

  async sendDirect(options) {
    /*
    var options = {
      to: 'kevin.foster.uk@gmail.com',
      to: {name: 'Kevin Foster', email: 'kevin.foster.uk@gmail.com'},
      from: 'support@getfeastin.com',
      from: {name: 'GetFeastin Support', email: 'support@getfeastin.com'},
      subject: 'This is a test',
      text: 'This is the text content',
      html: 'HTML content here'
    };
    */

    /*
    var mailOptions = {
        to: 'kevin.foster.uk@gmail.com', // receiver address,
        from: '"Fred Foo 👻" <foo@blurdybloop.com>', // sender address
        subject: 'Hello ✔', // Subject line
        text: 'Hello world?', // plain text body
        html: '<b>Hello world?</b>' // html body
    };
    */

    options = this.normalizeOptions(options)

    const toAddress = options.to.name
      ? '"' + options.to.name + '" <' + options.to.email + '>'
      : options.to.email
    const fromAddress = options.from.name
      ? '"' + options.from.name + '" <' + options.from.email + '>'
      : options.from.email

    const mailOptions: nodemailer.SendMailOptions = {
      to: toAddress,
      from: fromAddress,
      subject: options.subject,
      text: options.text,
      html: options.html,
    }

    if (options.envelopeFrom) {
      mailOptions.envelope = {
        from: options.envelopeFrom,
        to: options.to.email,
      }
    }

    return await this.transporter.sendMail(mailOptions)
  }

  normalizeOptions(options) {
    options = options ? { ...options } : {}
    if (!options.service) options.service = 'unknown'
    if (!options.type) options.type = 'unknown'
    if (options.from) {
      if (typeof options.from == 'string') {
        options.from = { name: null, email: options.from }
      } else {
        const fromName =
          typeof options.from.name == 'string' ? options.from.name : null
        const fromEmail =
          typeof options.from.email == 'string' ? options.from.email : null
        if (fromName && fromEmail) {
          options.from = { name: fromName, email: fromEmail }
        } else if (fromEmail) {
          options.from = { name: null, email: fromEmail }
        }
      }
    }
    if (options.to) {
      if (typeof options.to == 'string') {
        options.to = { name: null, email: options.to }
      } else {
        const toName =
          typeof options.to.name == 'string' ? options.to.name : null
        const toEmail =
          typeof options.to.email == 'string' ? options.to.email : null
        if (toName && toEmail) {
          options.to = { name: toName, email: toEmail }
        } else if (toEmail) {
          options.to = { name: null, email: toEmail }
        }
      }
    }
    return options
  }

  /**
   * Dispatch due rows from the pending email queue, paced per-project according to each
   * project's hourly send rate (see emailSendRatePerHour). Dispatch attempts within a run are
   * also spread evenly across the tick interval (see dispatchDelayMs below) so a large
   * simultaneous backlog across many projects - e.g. right after an outage - can't burst
   * the shared relay, even though no single project's own cap is ever exceeded. Invoked
   * every 60s by the seeded ServiceTaskManager 'email'/'processQueue' task - see
   * docs/mail-queue-pacing.md. No RepoTaskLock is needed: the Task record's own
   * concurrency: 1 already prevents overlapping runs.
   */
  async processQueue(): Promise<ProcessQueueResult> {
    const repoEmail = this.getRepo<RepoEmail>('email')
    const repoSurveyParticipant =
      this.getRepo<RepoSurveyParticipant>('surveyParticipant')

    const processBatchSize =
      this.config.model.app.mail.queue?.processBatchSize ?? 200
    const tickIntervalMs = 60_000 // matches the seeded task's 60s CronJob interval
    const ticksPerHour = 3_600_000 / tickIntervalMs

    const result: ProcessQueueResult = {
      dispatched: 0,
      failed: 0,
      errors: [],
    }

    const candidates = await repoEmail.find(
      { status: 'pending', scheduledAt: { $lte: new Date() } },
      { sort: { scheduledAt: 1 }, limit: processBatchSize * 5 },
    )

    if (candidates.length === 0) {
      this.logger.log('[MailQueue] No due rows found')
      return result
    }

    this.logger.log(
      `[MailQueue] ${candidates.length} due candidate(s) found (batch cap ${processBatchSize})`,
    )

    const byProject = new Map<string, Email[]>()
    for (const candidate of candidates) {
      const projectId = candidate.projectId || 'unknown'
      if (!byProject.has(projectId)) byProject.set(projectId, [])
      byProject.get(projectId)!.push(candidate)
    }

    interface ProjectRunState {
      maxPerRun: number
      sentThisRun: number
    }
    const projectState = new Map<string, ProjectRunState>()

    const getProjectState = async (
      projectId: string,
    ): Promise<ProjectRunState> => {
      const cached = projectState.get(projectId)
      if (cached) return cached

      const maxPerHour = await this.emailSendRatePerHour(projectId)
      const maxPerRun = Math.max(1, Math.ceil(maxPerHour / ticksPerHour))

      this.logger.log(
        `[MailQueue] Project ${projectId}: rate ${maxPerHour}/hour -> cap ${maxPerRun}/run`,
      )

      const state: ProjectRunState = {
        maxPerRun,
        sentThisRun: 0,
      }
      projectState.set(projectId, state)
      return state
    }

    // Spread this run's dispatch attempts evenly across the tick interval instead of
    // firing them as fast as I/O allows - see docs/mail-queue-pacing.md. This is what
    // protects the shared relay's aggregate load when many projects are simultaneously
    // in backlog (e.g. after an outage), on top of (not instead of) the per-project
    // maxPerRun cap below. Sized from what will actually be attempted this run (each
    // project's due rows capped at its own maxPerRun), not the raw candidate count - a
    // single backlogged project capped at a low maxPerRun should still be spread across
    // the full tick, not paced as if all its due rows were about to fire.
    let expectedAttempts = 0
    for (const [projectId, rows] of byProject) {
      const state = await getProjectState(projectId)
      expectedAttempts += Math.min(rows.length, state.maxPerRun)
    }
    const dispatchBudget = Math.min(expectedAttempts, processBatchSize)
    const dispatchDelayMs =
      dispatchBudget > 0 ? Math.floor(tickIntervalMs / dispatchBudget) : 0

    let dispatchedThisRun = 0
    let attemptedThisRun = 0
    let connectionLevelFailures = 0
    let madeProgress = true

    while (madeProgress && dispatchedThisRun < processBatchSize) {
      madeProgress = false

      for (const [projectId, rows] of byProject) {
        if (dispatchedThisRun >= processBatchSize) break
        if (rows.length === 0) continue

        const state = await getProjectState(projectId)

        if (state.sentThisRun >= state.maxPerRun) continue

        const row = rows.shift()!
        madeProgress = true
        attemptedThisRun++

        try {
          const context = DataSourceContext.fromDataSources({
            project: { lookupKey: projectId },
          })

          await this.send(row)
          if (row.error) throw new Error(row.error)

          const participantId = row.data?.participantId as string | undefined
          if (participantId) {
            await repoSurveyParticipant.updateOne(
              { _id: participantId },
              {
                $set: {
                  ...(row.type === 'invite'
                    ? { inviteSentAt: new Date() }
                    : { reminderSentAt: new Date() }),
                  updatedAt: new Date(),
                },
              },
              { context },
            )
          }

          result.dispatched++
          state.sentThisRun++
          dispatchedThisRun++
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Unknown error'
          this.logger.log(
            `[MailQueue] Project ${projectId}: row ${row._id} failed - ${message}`,
          )
          result.failed++
          result.errors.push({ emailId: row._id, message })
          if (this.isConnectionLevelError(error)) connectionLevelFailures++
        }

        // Pace every attempted row (success or failure - both are a real relay hit)
        // evenly across the tick interval, not just the count each project may send.
        if (attemptedThisRun < dispatchBudget && dispatchDelayMs > 0) {
          await this.sleep(dispatchDelayMs)
        }
      }
    }

    this.logger.log(
      `[MailQueue] Run complete: ${result.dispatched} dispatched, ${result.failed} failed`,
    )

    if (result.failed > 0) {
      const sample = result.errors
        .slice(0, 5)
        .map((e) => `${e.emailId}: ${e.message}`)
        .join('; ')
      const relayDown =
        attemptedThisRun > 0 && connectionLevelFailures === attemptedThisRun

      // Previously every dispatch failure was caught, logged, and dropped with
      // zero signal - customer invites stranded in "Queued" forever. Make it
      // reach BugSink. Do NOT throw: a throw triggers task backoff and delays
      // every other project's mail (see the mail-pipeline failure-detection plan).
      captureWithFingerprint(
        relayDown ? ['mail-relay-unreachable'] : undefined,
        new Error(
          relayDown
            ? `[MailQueue] Mail relay unreachable: all ${attemptedThisRun} dispatch attempt(s) failed with a connection-level error. Sample: ${sample}`
            : `[MailQueue] ${result.failed} of ${attemptedThisRun} dispatch attempt(s) failed. Sample: ${sample}`,
        ),
      )
    }

    return result
  }

  /**
   * True for errors that mean the relay itself is unreachable (DNS, TCP, TLS
   * handshake) rather than a per-recipient rejection. Used to fingerprint a
   * total mail outage distinctly from scattered individual failures.
   */
  private isConnectionLevelError(error: unknown): boolean {
    if (!(error instanceof Error)) return false
    const code = (error as { code?: unknown }).code
    if (
      typeof code === 'string' &&
      [
        'ETIMEDOUT',
        'ECONNREFUSED',
        'ECONNRESET',
        'EAI_AGAIN',
        'ENOTFOUND',
        'ECONNECTION',
        'ESOCKET',
      ].includes(code)
    ) {
      return true
    }
    return /unexpected close|wrong version number|unable to verify|handshake|ETIMEDOUT|ECONNREFUSED/i.test(
      error.message,
    )
  }

  /**
   * Counts against `createdAt`, not `sent` - deliberately. A pending (queued-but-not-yet-
   * dispatched) row already counts toward the limit as soon as it's enqueued, protecting
   * against burst-enqueue abuse before any of those rows have actually sent. Do not "fix"
   * this to filter on `sent` - see the mail-queue-pacing design doc.
   */
  async frequencyLimit(options: {
    userId?: string
    to?: string
    type: string
    rules: {
      multiplier: number // number of units
      unit: string // minutes / hours / days / months
      limit: number
    }[]
  }) {
    const repoEmail = this.getRepo<RepoEmail>('email')
    const userId = options.userId ? options.userId : null
    const to = options.to ? options.to : null
    const type = options.type ? options.type : null
    const rules = options.rules ? options.rules : []

    for (let x = 0; x < rules.length; x++) {
      const { multiplier, unit, limit } = rules[x]
      const query: Record<string, unknown> = {}

      if (userId) query.userId = userId
      if (to) query.to = to
      query.createdAt = {
        // @ts-expect-error -- moment-timezone's unit type doesn't allow a dynamic string here
        $gte: momentTimezone().subtract(multiplier, unit).toDate(),
      }
      if (type) query.type = type

      const count = await repoEmail.count(query)
      if (count >= limit) {
        throw new ServerErrorBadRequest({
          ref: 'EMAIL_FREQUENCY_LIMIT',
          message:
            'We already sent ' +
            limit +
            ' emails(s) within the past ' +
            multiplier +
            ' ' +
            unit +
            '.',
          userMessage:
            'We sent too many emails for you recently.' +
            ' You have reached the limit. Try again later.',
        })
      }
    }
  }
}

export default ServiceEmail
