import {
  Service,
  ServerErrorNotFound,
  ServerErrorForbidden,
  ServerErrorBadRequest,
} from '@datacapy/server'
import { DataSourceContext } from '@datacapy/om'
import momentTimezone from 'moment-timezone'
import {
  Survey,
  SurveyParticipant,
  buildTemplateContext,
  resolveTemplate,
} from 'veysur-common'

import {
  ConfigJwt,
  Email,
  JwtParticipant,
  RepoEmailSuppression,
  RepoSettingSurvey,
  RepoSurvey,
  RepoSurveyParticipant,
  RepoSurveyResponse,
  RepoSurveySnapshotPartial,
  RepoSurveyPublication,
  ServiceProject,
} from 'model'
import { findLiveSuppression } from 'model/common'
import { Jwt } from 'acl/util/Jwt'
import type { GeoServiceContract } from 'model/common'
import { ServiceEmailTemplate } from './core/ServiceEmailTemplate'
import { ServiceEmail } from './ServiceEmail'
import { ServiceEmailDomainCheck } from './ServiceEmailDomainCheck'
import { ParticipantToken } from './core/ServiceSurveyParticipant/ParticipantToken'
import { EmailVerifyToken } from './core/ServiceSurveyParticipant/EmailVerifyToken'

const ERROR_REG_REQUIRED = 'ERROR_REG_REQUIRED'
const ERROR_INVALID_TOKEN = 'ERROR_INVALID_TOKEN'
const ERROR_AUTH_FAIL = 'ERROR_AUTH_FAIL'
const ERROR_SURVEY_NOT_STARTED = 'ERROR_SURVEY_NOT_STARTED'
const ERROR_SURVEY_ENDED = 'ERROR_SURVEY_ENDED'
const ERROR_SNAPSHOT_NOT_FOUND = 'ERROR_SNAPSHOT_NOT_FOUND'
const ERROR_REG_NOT_OPEN = 'ERROR_REG_NOT_OPEN'
const ERROR_COUNTRY_BLOCKED = 'ERROR_COUNTRY_BLOCKED'
const ERROR_DISPOSABLE_EMAIL_DOMAIN = 'ERROR_DISPOSABLE_EMAIL_DOMAIN'

export class ServiceAuthParticipant extends Service {
  constructor() {
    super({
      name: 'authParticipant',
    })
  }

  async auth({
    surveyId,
    projectId,
    token,
    emailVerifyToken = undefined,
    jwtConfig,
  }) {
    const context = DataSourceContext.fromDataSources({
      project: { lookupKey: projectId },
    })
    const repoPublication =
      this.getRepo<RepoSurveyPublication>('surveyPublication')
    const repoSurveySnapshot = this.getRepo<RepoSurveySnapshotPartial>(
      'surveySnapshotPartial',
    )

    const publication = await repoPublication.findOne(
      {
        surveyId,
        stoppedAt: null,
      },
      { context },
    )

    if (!publication) {
      throw new ServerErrorNotFound({
        ref: ERROR_SURVEY_NOT_STARTED,
        key: 'error.surveyUnavailable',
        userMessage: 'Survey is not available',
      })
    }

    const snapshot = await repoSurveySnapshot.findOne(
      {
        _id: publication.snapshotId,
      },
      { context },
    )

    if (!snapshot) {
      throw new ServerErrorNotFound({
        ref: ERROR_SNAPSHOT_NOT_FOUND,
        key: 'error.surveySnapshotNotFound',
        userMessage: 'Survey snapshot not found',
      })
    }

    const survey = snapshot.surveyPartial

    if (
      survey.schedule.start !== null &&
      momentTimezone(survey.schedule.start).isAfter()
    ) {
      throw new ServerErrorNotFound({
        ref: ERROR_SURVEY_NOT_STARTED,
        key: 'error.surveyNotStarted',
        userMessage: 'Survey has not started yet',
      })
    }
    if (
      survey.schedule.end !== null &&
      momentTimezone(survey.schedule.end).isBefore()
    ) {
      throw new ServerErrorNotFound({
        ref: ERROR_SURVEY_ENDED,
        key: 'error.surveyEnded',
        userMessage: 'Survey has ended',
      })
    }

    if (!token) {
      if (survey.access.publicReg) {
        // visitor must register to get a token (open or closed survey)
        throw new ServerErrorForbidden({
          ref: ERROR_REG_REQUIRED,
          key: 'error.registrationRequired',
          userMessage: 'Registration required',
        })
      }

      if (survey.access.open) {
        // fully open, no registration required — issue anonymous JWT
        const jwtParticipant = new JwtParticipant({
          participantId: null,
          surveyId,
          snapshotId: snapshot._id,
          publicationId: publication._id,
          projectId,
        })
        return await this.createJsonWebToken(jwtParticipant, jwtConfig)
      }

      throw new ServerErrorForbidden({
        ref: ERROR_INVALID_TOKEN,
        key: 'error.invalidToken',
        userMessage: 'Invalid token',
      })
    }

    const repoSurveyParticipant =
      this.getRepo<RepoSurveyParticipant>('surveyParticipant')
    const participant = await repoSurveyParticipant.findOne(
      {
        surveyId,
        token,
      },
      { context },
    )

    if (!participant) {
      throw new ServerErrorForbidden({
        ref: ERROR_AUTH_FAIL,
        key: 'error.invalidCredentials',
        userMessage: 'Invalid credentials',
      })
    }

    if (
      participant.emailStatus === 'pending' &&
      emailVerifyToken &&
      participant.emailVerifyToken &&
      emailVerifyToken === participant.emailVerifyToken
    ) {
      await repoSurveyParticipant.updateOne(
        { _id: participant._id },
        { $set: { emailStatus: 'verified', updatedAt: new Date() } },
        { context },
      )
    }

    // A returning participant should continue against the publication/snapshot
    // they started answering against, not silently jump to whatever is
    // currently live — otherwise an in-progress response becomes unreachable
    // the moment the survey is republished with a new snapshot.
    let resumeSnapshotId = snapshot._id
    let resumePublicationId = publication._id
    let reset = false

    const repoSurveyResponse =
      this.getRepo<RepoSurveyResponse>('surveyResponse')
    const existingResponse = await repoSurveyResponse.findOne(
      { surveyId, participantId: participant._id, completed: false },
      { context, sort: { createdAt: -1 } },
    )

    // A response record is created as soon as the participant clicks "Start"
    // (before they've answered anything), so its mere existence doesn't mean
    // there's progress worth resuming — only pin them to the original
    // snapshot/publication once at least one answer has actually been saved.
    const hasPartialAnswers =
      !!existingResponse &&
      Object.keys(existingResponse.answers ?? {}).length > 0

    if (hasPartialAnswers && existingResponse.snapshotId !== snapshot._id) {
      const originalSnapshot = await repoSurveySnapshot.findOne(
        { _id: existingResponse.snapshotId },
        { context },
      )

      if (originalSnapshot) {
        // Original snapshot still exists — resume against it, even though it
        // is no longer the live publication.
        resumeSnapshotId = existingResponse.snapshotId
        resumePublicationId = existingResponse.publicationId
      } else {
        // Original snapshot was deleted mid-survey — there is nowhere to
        // resume the in-progress answers against, so start fresh on the
        // current live publication and tell the frontend why.
        reset = true
      }
    }

    const jwtParticipant = new JwtParticipant({
      // An anonymous survey must never link a response to a participant, so the
      // participant id is kept out of the JWT entirely — the auto-generated
      // sessionId is the only identifier that reaches the response layer.
      participantId: survey.access.anonymous ? null : participant._id,
      surveyId,
      snapshotId: resumeSnapshotId,
      publicationId: resumePublicationId,
      projectId,
    })

    return {
      ...(await this.createJsonWebToken(jwtParticipant, jwtConfig)),
      reset,
    }
  }

  async register({
    surveyId,
    projectId,
    nameFirst,
    nameLast,
    email,
    language,
    attributes,
    ip = undefined,
  }) {
    const geo = this.getService('geo') as unknown as
      GeoServiceContract | undefined
    if (geo) {
      const { country } = await geo.detectCountry({ ip })
      if (country && geo.isCountryBlocked(country)) {
        throw new ServerErrorForbidden({
          ref: ERROR_COUNTRY_BLOCKED,
          key: 'error.countryBlocked',
          userMessage:
            'VeySur does not currently provide service in your country',
        })
      }
    }

    if (
      await this.getService<ServiceEmailDomainCheck>(
        'emailDomainCheck',
      ).isDisposableEmailDomain(email)
    ) {
      throw new ServerErrorBadRequest({
        ref: ERROR_DISPOSABLE_EMAIL_DOMAIN,
        key: 'error.disposableEmailDomain',
        userMessage: 'Please use a permanent email address to register',
      })
    }

    const context = DataSourceContext.fromDataSources({
      project: { lookupKey: projectId },
    })

    const repoPublication =
      this.getRepo<RepoSurveyPublication>('surveyPublication')
    const repoSurveySnapshot = this.getRepo<RepoSurveySnapshotPartial>(
      'surveySnapshotPartial',
    )

    const publication = await repoPublication.findOne(
      { surveyId, stoppedAt: null },
      { context },
    )
    if (!publication) {
      throw new ServerErrorNotFound({
        ref: ERROR_SURVEY_NOT_STARTED,
        key: 'error.surveyUnavailable',
        userMessage: 'Survey is not available',
      })
    }

    const snapshot = await repoSurveySnapshot.findOne(
      { _id: publication.snapshotId },
      { context },
    )
    if (!snapshot) {
      throw new ServerErrorNotFound({
        ref: ERROR_SNAPSHOT_NOT_FOUND,
        key: 'error.surveySnapshotNotFound',
        userMessage: 'Survey snapshot not found',
      })
    }

    const survey = snapshot.surveyPartial

    if (
      survey.schedule.start !== null &&
      momentTimezone(survey.schedule.start).isAfter()
    ) {
      throw new ServerErrorNotFound({
        ref: ERROR_SURVEY_NOT_STARTED,
        key: 'error.surveyNotStarted',
        userMessage: 'Survey has not started yet',
      })
    }
    if (
      survey.schedule.end !== null &&
      momentTimezone(survey.schedule.end).isBefore()
    ) {
      throw new ServerErrorNotFound({
        ref: ERROR_SURVEY_ENDED,
        key: 'error.surveyEnded',
        userMessage: 'Survey has ended',
      })
    }

    if (!survey.access.publicReg) {
      throw new ServerErrorForbidden({
        ref: ERROR_REG_NOT_OPEN,
        key: 'error.registrationNotOpen',
        userMessage: 'Registration is not open for this survey',
      })
    }

    const repoSurveyParticipant =
      this.getRepo<RepoSurveyParticipant>('surveyParticipant')
    const repoSurvey = this.getRepo<RepoSurvey>('survey')
    const repoSettingSurvey = this.getRepo<RepoSettingSurvey>('settingSurvey')

    const existingParticipant = await repoSurveyParticipant.findOne(
      { surveyId, email },
      { context },
    )

    if (existingParticipant) {
      await EmailVerifyToken.ensureFor(
        existingParticipant,
        repoSurveyParticipant,
        context,
      )

      if (!existingParticipant.reminderSentAt) {
        await this._sendRegistrationEmail({
          participant: existingParticipant,
          surveyId,
          projectId,
          survey,
          context,
          isReminder: true,
        })
      }
      return {
        message:
          'Registration successful. Check your email for the survey link.',
      }
    }

    const token = await ParticipantToken.generateUnique({
      surveyId,
      context,
      repoSurveyParticipant,
      repoSurvey,
      repoSettingSurvey,
    })

    const participant = new SurveyParticipant({
      surveyId,
      nameFirst,
      nameLast,
      email,
      language: language ?? 'en',
      token,
      emailVerifyToken: EmailVerifyToken.generate(),
      attributes: attributes ?? {},
      createdById: null,
    })

    await repoSurveyParticipant.create(participant, { context })

    await this._sendRegistrationEmail({
      participant,
      surveyId,
      projectId,
      survey,
      context,
    })

    return {
      message: 'Registration successful. Check your email for the survey link.',
    }
  }

  private async _sendRegistrationEmail({
    participant,
    surveyId,
    projectId,
    survey,
    context,
    isReminder = false,
  }: {
    participant: SurveyParticipant
    surveyId: string
    projectId: string
    survey: Survey
    context: DataSourceContext
    isReminder?: boolean
  }) {
    const repoEmailSuppression =
      this.getRepo<RepoEmailSuppression>('emailSuppression')
    const repoSurveyParticipant =
      this.getRepo<RepoSurveyParticipant>('surveyParticipant')
    const serviceEmail = this.getService<ServiceEmail>('email')
    const serviceEmailTemplate = this.getService(
      'emailTemplate',
    ) as ServiceEmailTemplate

    const project =
      await this.getService<ServiceProject>('project').getById(projectId)
    if (!project) {
      return
    }

    const suppressed = await findLiveSuppression(
      repoEmailSuppression,
      participant.email,
    )
    if (suppressed) {
      return
    }

    const emailTemplate = await serviceEmailTemplate.getResolved({
      projectId,
      surveyId,
      type: 'invite',
      lang: participant.language || 'en',
    })
    if (!emailTemplate) {
      return
    }

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
      project: { name: project.name || this.config.model.app.companyName },
    })

    const subject = resolveTemplate(
      emailTemplate.subject || `You're invited: ${survey.name}`,
      templateContext,
    )
    const html = resolveTemplate(emailTemplate.body, templateContext)

    const bounceAddress = this.config.model.app.mail.bounceAddress
    const emailRecord: Email = {
      type: 'invite',
      projectId,
      to: participant.email,
      subject,
      html,
      templateData: { ...templateContext } as Record<string, unknown>,
      ...(bounceAddress && {
        envelopeFrom: `bounces+${projectId}-${surveyId}@${bounceAddress}`,
      }),
    }

    await serviceEmail.send(emailRecord)

    if (!emailRecord.error) {
      const sentField = isReminder ? 'reminderSentAt' : 'inviteSentAt'
      await repoSurveyParticipant.updateOne(
        { _id: participant._id },
        { $set: { [sentField]: new Date(), updatedAt: new Date() } },
        { context },
      )
    }
  }

  async createJsonWebToken(
    jwtParticipant: JwtParticipant,
    jwtConfig: ConfigJwt,
  ) {
    const expireSeconds: number =
      this.config.model.app.jwt.participantLifetimeSeconds
    const created = new Date()
    const jwt: string = await Jwt.create(
      { ...jwtParticipant },
      jwtConfig,
      expireSeconds,
    )

    return {
      jwt,
      created,
      expires: momentTimezone(created).add(expireSeconds, 'seconds'),
    }
  }
}

export default ServiceAuthParticipant
