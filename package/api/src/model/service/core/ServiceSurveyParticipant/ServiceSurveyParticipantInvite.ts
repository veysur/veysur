import { Service, ServerErrorNotFound } from 'mzen-server'
import { DataSourceContext } from 'mzen-om'
import {
  RepoSurveyParticipant,
  RepoSurvey,
  RepoEmailSuppression,
  RepoSurveyResponse,
  Email,
  ServiceProject,
} from 'model'
import {
  EmailTemplate,
  buildTemplateContext,
  resolveTemplate,
} from 'veysur-common'
import {
  findLiveSuppression,
  validateEmail,
  buildCompletedFilter,
} from 'model/common'
import { ServiceEmailTemplate } from '../ServiceEmailTemplate'
import { ServiceEmail } from '../../ServiceEmail'
import { EmailVerifyToken } from './EmailVerifyToken'

/** Default hourly invite-send rate. Used as-is by the self-hosted edition (no
 * plan model), and as the fallback when a project's plan has no
 * EMAIL_SEND_RATE_PER_HOUR entry yet. */
const FALLBACK_MAX_PER_HOUR = 150

export interface SendInvitesResult {
  queued: number
  errors: number
  total: number
  hasMore: boolean
  processed?: number
  batchErrors: Array<{ email: string; message: string }>
}

export class ServiceSurveyParticipantEmail extends Service {
  constructor() {
    super({ name: 'surveyParticipantEmail' })
  }

  /**
   * The project's hourly invite-send rate. Core (self-hosted) has no plan
   * model, so it is the flat default. The platform guarded subclass overrides
   * this to read the project's EMAIL_SEND_RATE_PER_HOUR plan feature. WS4 seam.
   */
  protected async emailSendRatePerHour(_projectId: string): Promise<number> {
    return FALLBACK_MAX_PER_HOUR
  }

  /**
   * Send email invites to participants in batches
   * Returns progress information and any errors encountered
   */
  async send({
    surveyId,
    projectId,
    skip = 0,
    batchSize = 100,
  }: {
    surveyId: string
    projectId: string
    skip?: number
    batchSize?: number
  }): Promise<SendInvitesResult> {
    return this._sendEmail({
      surveyId,
      projectId,
      skip,
      batchSize,
      emailType: 'invite',
    })
  }

  /**
   * Send email reminders to participants in batches
   * Returns progress information and any errors encountered
   */
  async sendReminders({
    surveyId,
    projectId,
    skip = 0,
    batchSize = 100,
  }: {
    surveyId: string
    projectId: string
    skip?: number
    batchSize?: number
  }): Promise<SendInvitesResult> {
    return this._sendEmail({
      surveyId,
      projectId,
      skip,
      batchSize,
      emailType: 'reminder',
    })
  }

  /**
   * Private method to send emails (invites or reminders) to participants in batches
   * Returns progress information and any errors encountered
   */
  private async _sendEmail({
    surveyId,
    projectId,
    skip = 0,
    batchSize = 100,
    emailType,
  }: {
    surveyId: string
    projectId: string
    skip?: number
    batchSize?: number
    emailType: 'invite' | 'reminder'
  }): Promise<SendInvitesResult> {
    // Get repos and services
    const context = DataSourceContext.fromDataSources({
      project: { lookupKey: projectId },
    })
    const repoSurveyParticipant =
      this.getRepo<RepoSurveyParticipant>('surveyParticipant')
    const repoSurvey = this.getRepo<RepoSurvey>('survey')
    const repoEmailSuppression =
      this.getRepo<RepoEmailSuppression>('emailSuppression')
    const repoSurveyResponse =
      this.getRepo<RepoSurveyResponse>('surveyResponse')
    const serviceEmail = this.getService<ServiceEmail>('email')
    const serviceEmailTemplate = this.getService(
      'emailTemplate',
    ) as ServiceEmailTemplate

    const project =
      await this.getService<ServiceProject>('project').getById(projectId)

    const survey = await repoSurvey.findOne({ _id: surveyId }, { context })
    if (!survey) {
      throw new ServerErrorNotFound('Survey not found')
    }

    const responseQuery: Record<string, unknown> = { surveyId }
    if (emailType === 'reminder') {
      // Participants who started but did not complete the survey should
      // still receive reminders - only exclude completed responses.
      Object.assign(responseQuery, buildCompletedFilter())
    }

    const respondedParticipants = await repoSurveyResponse.find(responseQuery, {
      context,
      fields: { participantId: 1 },
      skipValidation: true,
    })
    const respondedParticipantIds = respondedParticipants.map(
      (response) => response.participantId,
    )

    // inviteQueuedAt/reminderQueuedAt are new fields - participants created before this
    // field existed have no such key in their stored document at all, and mzen-om's
    // `{ field: null }` query only matches an explicit null, not a missing key. Match
    // both cases so pre-existing participants remain eligible.
    const notQueuedFilter = (field: 'inviteQueuedAt' | 'reminderQueuedAt') => ({
      $or: [{ [field]: null }, { [field]: { $exists: false } }],
    })

    const query: Record<string, unknown> = {
      surveyId,
      email: { $ne: null },
      ...(emailType === 'invite'
        ? { inviteSentAt: null, ...notQueuedFilter('inviteQueuedAt') }
        : {
            inviteSentAt: { $ne: null },
            reminderSentAt: null,
            ...notQueuedFilter('reminderQueuedAt'),
          }),
      ...(respondedParticipantIds.length > 0 && {
        _id: { $nin: respondedParticipantIds },
      }),
    }

    const queryOptions = { context, skipValidation: true }

    const totalCount = await repoSurveyParticipant.count(query, queryOptions)

    if (totalCount === 0 || skip >= totalCount) {
      return {
        queued: 0,
        errors: 0,
        total: totalCount,
        hasMore: false,
        batchErrors: [],
      }
    }

    const batch = await repoSurveyParticipant.find(query, {
      context,
      limit: batchSize,
      skip: 0, // Always use 0 since query filters correctly
      sort: { createdAt: -1 },
      skipValidation: true,
    })

    // Spread this batch's sends over a window sized to hold the project near its
    // configured EMAIL_SEND_RATE_PER_HOUR rate - see docs/mail-queue-pacing.md. Each page
    // computes its own window from its own size; consecutive pages (the frontend calls
    // them back-to-back) chain closely enough in practice to hold the overall campaign
    // near the target rate. A small batch gets a short window and sends almost
    // immediately, which is expected - the target is a steady rate, not a mandatory
    // minimum spread for small batches.
    const perProjectMaxPerHour = await this.emailSendRatePerHour(projectId)
    const spreadWindowMs =
      (batch.length / perProjectMaxPerHour) * 60 * 60 * 1000

    let batchQueued = 0
    let batchErrors = 0
    const errorList: Array<{ email: string; message: string }> = []
    const templateCache = new Map<string, EmailTemplate | null>()

    for (const participant of batch) {
      try {
        if (!participant.email || participant.email.trim() === '') {
          throw new Error('No email address')
        }

        validateEmail(participant.email)

        const suppressed = await findLiveSuppression(
          repoEmailSuppression,
          participant.email,
        )
        if (suppressed) {
          throw new Error(`Email suppressed: ${suppressed.reason}`)
        }

        // Get resolved email template with automatic fallback
        // (participant lang -> survey -> project -> system), cached per
        // language since most batches share the same language.
        const lang = participant.language || 'en'
        if (!templateCache.has(lang)) {
          templateCache.set(
            lang,
            await serviceEmailTemplate.getResolved({
              projectId,
              surveyId,
              type: emailType,
              lang,
            }),
          )
        }
        const emailTemplate = templateCache.get(lang)

        if (!emailTemplate) {
          throw new Error(`No email template found for ${emailType} emails`)
        }

        // Migration/backfill fallback for participants created before this
        // field existed - the primary path is generation at participant
        // creation, so this should rarely fire.
        await EmailVerifyToken.ensureFor(
          participant,
          repoSurveyParticipant,
          context,
        )

        const surveyDomain = this.config.model.app.webDomain
        const surveyLink = EmailVerifyToken.buildSurveyLink({
          surveyDomain,
          surveyId,
          token: participant.token,
          emailVerifyToken: participant.emailVerifyToken,
          language: participant.language,
        })

        const templateContext = buildTemplateContext({
          participant,
          survey: { name: survey.name, link: surveyLink },
          project: { name: project?.name || this.config.model.app.companyName },
        })

        const subject = resolveTemplate(
          emailTemplate.subject || `You're invited: ${survey.name}`,
          templateContext,
        )
        const html = resolveTemplate(emailTemplate.body, templateContext)

        const bounceAddress = this.config.model.app.mail.bounceAddress
        const emailRecord: Email = {
          type: emailType,
          projectId,
          to: participant.email,
          subject,
          html,
          templateData: { ...templateContext } as Record<string, unknown>,
          data: { participantId: participant._id, surveyId },
          ...(bounceAddress && {
            envelopeFrom: `bounces+${projectId}-${surveyId}@${bounceAddress}`,
          }),
        }

        const scheduledAt = new Date(
          Date.now() + Math.random() * spreadWindowMs,
        )
        await serviceEmail.enqueue(emailRecord, scheduledAt)

        const hasStaleBounceCache =
          participant.bounceType !== null ||
          participant.complaintAt !== null ||
          participant.emailStatus === 'invalid'

        await repoSurveyParticipant.updateOne(
          { _id: participant._id },
          {
            $set: {
              ...(emailType === 'invite'
                ? { inviteQueuedAt: new Date() }
                : { reminderQueuedAt: new Date() }),
              ...(hasStaleBounceCache && {
                emailStatus: 'pending',
                bounceType: null,
                bounceAt: null,
                complaintAt: null,
              }),
              updatedAt: new Date(),
            },
          },
          { context },
        )

        if (hasStaleBounceCache) {
          await repoEmailSuppression.updateOne(
            { email: participant.email },
            { $set: { softBounceEvents: [] } },
          )
        }

        batchQueued++
      } catch (error) {
        batchErrors++
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error'
        errorList.push({
          email: participant.email || 'unknown',
          message: errorMessage,
        })
      }
    }

    const processedCount = skip + batchQueued + batchErrors
    const hasMore = batch.length === batchSize && processedCount < totalCount

    return {
      queued: batchQueued,
      errors: batchErrors,
      total: totalCount,
      hasMore,
      processed: processedCount,
      batchErrors: errorList,
    }
  }
}

export default ServiceSurveyParticipantEmail
