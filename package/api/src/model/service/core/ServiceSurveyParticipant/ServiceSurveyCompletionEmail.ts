import { Service } from 'mzen-server'
import {
  Survey,
  SettingSurvey,
  buildTemplateContext,
  resolveTemplate,
} from 'veysur-common'

import {
  RepoSurvey,
  RepoSurveyParticipant,
  RepoSettingSurvey,
  RepoUser,
  RepoEmailSuppression,
  Email,
  ServiceProject,
} from 'model'
import { findLiveSuppression, resolveNotifyRecipients } from 'model/common'
import { ServiceEmailTemplate } from '../ServiceEmailTemplate'
import { ServiceEmail } from '../../ServiceEmail'
import { contextForProject } from 'common'

type CompletionEmailType = 'thankYou' | 'adminBasic' | 'adminDetail'

export class ServiceSurveyCompletionEmail extends Service {
  constructor() {
    super({ name: 'surveyCompletionEmail' })
  }

  /**
   * Sends the thank-you (participant) and adminBasic/adminDetail
   * (notify.basic/notify.detailed recipients) emails for a just-completed
   * survey response. Never throws - the participant's submission must
   * succeed regardless of email outcomes.
   */
  async sendCompletionEmails({
    projectId,
    surveyId,
    participantId,
    response,
  }: {
    projectId: string
    surveyId: string
    snapshotId: string
    participantId?: string
    sessionId?: string
    response: { answers?: Record<string, unknown> }
  }): Promise<void> {
    try {
      await this._sendCompletionEmails({
        projectId,
        surveyId,
        participantId,
        response,
      })
    } catch (error) {
      this.logger.log('Failed to send survey completion emails', {
        error,
        projectId,
        surveyId,
      })
    }
  }

  private async _sendCompletionEmails({
    projectId,
    surveyId,
    participantId,
    response,
  }: {
    projectId: string
    surveyId: string
    participantId?: string
    response: { answers?: Record<string, unknown> }
  }): Promise<void> {
    const context = contextForProject(projectId)

    const repoSurvey = this.getRepo<RepoSurvey>('survey')
    const repoSettingSurvey = this.getRepo<RepoSettingSurvey>('settingSurvey')
    const repoSurveyParticipant =
      this.getRepo<RepoSurveyParticipant>('surveyParticipant')
    const repoUser = this.getRepo<RepoUser>('user')
    const repoEmailSuppression =
      this.getRepo<RepoEmailSuppression>('emailSuppression')
    const serviceEmail = this.getService<ServiceEmail>('email')
    const serviceEmailTemplate = this.getService(
      'emailTemplate',
    ) as ServiceEmailTemplate

    const project =
      await this.getService<ServiceProject>('project').getById(projectId)
    if (!project) return

    const surveyDoc = await repoSurvey.findOne({ _id: surveyId }, { context })
    if (!surveyDoc) return

    const settingSurveyDoc = await repoSettingSurvey.findOne({}, { context })

    const survey = new Survey(surveyDoc)
    const settingSurvey = new SettingSurvey(settingSurveyDoc ?? {})

    const notify = survey.getNotify(settingSurvey)
    const participantSettings = survey.getParticipant(settingSurvey)
    const access = survey.getAccess(settingSurvey)
    const lang = survey.getLanguage(settingSurvey)

    const participant = participantId
      ? await repoSurveyParticipant.findOne({ _id: participantId }, { context })
      : null

    let ownerEmail: string | null = null
    if (
      notify.basic.includes('{{projectOwner.email}}') ||
      notify.detailed.includes('{{projectOwner.email}}')
    ) {
      const owner = project.ownerId
        ? await repoUser.findOne({ _id: project.ownerId })
        : null
      ownerEmail = owner?.email ?? null
    }

    const templateContext = buildTemplateContext({
      participant,
      answers: response.answers ?? {},
      projectOwnerEmail: ownerEmail,
      survey: { name: survey.name },
      project: { name: project.name || this.config.model.app.companyName },
    })

    // Notify-recipient resolution reuses the shared context, but privacy-gates
    // participant.email behind the survey's anonymity setting - even if a
    // participant record happens to carry an email for an anonymous survey,
    // {{participant.email}} in notify.basic/notify.detailed must not resolve it.
    const notifyContext = {
      ...templateContext,
      participant: {
        ...templateContext.participant,
        email:
          access.anonymous === false ? templateContext.participant.email : null,
      },
    }

    const bounceAddress = this.config.model.app.mail.bounceAddress
    const envelopeFrom = bounceAddress
      ? `bounces+${projectId}-${surveyId}@${bounceAddress}`
      : undefined

    const trySend = async (
      type: CompletionEmailType,
      to: string,
      emailLang: string,
    ) => {
      try {
        const suppressed = await findLiveSuppression(repoEmailSuppression, to)
        if (suppressed) return

        const emailTemplate = await serviceEmailTemplate.getResolved({
          projectId,
          surveyId,
          type,
          lang: emailLang,
        })
        if (!emailTemplate) return

        const subject = resolveTemplate(
          emailTemplate.subject || survey.name,
          templateContext,
        )
        const html = resolveTemplate(emailTemplate.body, templateContext)

        const emailRecord: Email = {
          type,
          projectId,
          to,
          subject,
          html,
          templateData: { ...templateContext } as Record<string, unknown>,
          ...(envelopeFrom && { envelopeFrom }),
        }

        await serviceEmail.send(emailRecord)
      } catch (error) {
        this.logger.log('Failed to send survey completion email', {
          error,
          type,
          to,
          projectId,
          surveyId,
        })
      }
    }

    if (participant?.email && participantSettings.thankYouEmail !== false) {
      await trySend(
        'thankYou',
        participant.email,
        participant.language || lang.default || 'en',
      )
    }

    const adminLang = lang.default || 'en'

    const basicRecipients = resolveNotifyRecipients(notify.basic, notifyContext)
    for (const to of basicRecipients) {
      await trySend('adminBasic', to, adminLang)
    }

    const detailedRecipients = resolveNotifyRecipients(
      notify.detailed,
      notifyContext,
    )
    for (const to of detailedRecipients) {
      await trySend('adminDetail', to, adminLang)
    }
  }
}

export default ServiceSurveyCompletionEmail
