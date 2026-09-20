import {
  Service,
  ServerErrorForbidden,
  ServerErrorBadRequest,
} from 'mzen-server'
import { DataSourceContext } from 'mzen-om'
import {
  SurveyResponseValidator,
  SurveySnapshot,
  anonymisedTimestamp,
  isSurveyQuestion,
  isGroupSection,
} from 'veysur-common'

import {
  RepoSurveyResponse,
  RepoSurveySnapshot,
  ServiceSurveyCompletionEmail,
} from 'model'
import { truncateIp } from 'model/common'

export class ServiceSurveyParticipantResponse extends Service {
  constructor() {
    super({
      name: 'surveyParticipantResponse',
    })
  }

  /**
   * Called before persisting the first answer to a response, so a subclass can
   * reject the write (e.g. a response limit was reached). No-op in core. Extension seam.
   */
  protected async onResponseFirstAnswerGuard(
    _projectId: string,
  ): Promise<void> {}

  /**
   * Called after the first answer to a response has been persisted, so a
   * subclass can record usage. No-op in core. Extension seam.
   */
  protected async onResponseFirstAnswerRecorded(
    _projectId: string,
  ): Promise<void> {}

  async get({ aclContext }) {
    const { surveyId, snapshotId, projectId } = aclContext

    const context = DataSourceContext.fromDataSources({
      project: { lookupKey: projectId },
    })
    const repo = this.getRepo<RepoSurveyResponse>('surveyResponse')

    const idData = this.getIdData(aclContext)

    const response = await repo.findOne(
      {
        surveyId,
        snapshotId,
        ...idData,
      },
      { context },
    )

    return (response && { response }) || null
  }

  async save({ response, aclContext, ip = null, referrerUrl = null }) {
    const {
      surveyId,
      snapshotId,
      publicationId,
      projectId,
      participantId,
      sessionId,
    } = aclContext

    const context = DataSourceContext.fromDataSources({
      project: { lookupKey: projectId },
    })
    const repo = this.getRepo<RepoSurveyResponse>('surveyResponse')

    const idData = this.getIdData(aclContext)

    const query = {
      surveyId,
      snapshotId,
      ...idData,
    }

    const existingResponse = await repo.findOne(query, { context })

    const isCompleting = !!response.completedAt
    const isFirstAnswer =
      Object.keys(response.answers ?? {}).length > 0 &&
      !existingResponse?.startedAt

    if (isFirstAnswer) {
      await this.onResponseFirstAnswerGuard(projectId)
    }

    const repoSnapshotData = this.getRepo<RepoSurveySnapshot>('surveySnapshot')
    // Load the snapshot up front on every save — its settings (anonymous, ip,
    // referrerUrl, timestamp) all gate what may be written to the response.
    const snapshotData: SurveySnapshot | null = await repoSnapshotData.findOne(
      { snapshotId },
      { context },
    )
    const anonymous = !!snapshotData?.survey?.access?.anonymous

    if (isCompleting) {
      if (snapshotData?.survey?.elements) {
        const validator = new SurveyResponseValidator()
        const questions = Array.from(snapshotData.survey.elements).filter(
          isSurveyQuestion,
        )
        const sections = Array.from(snapshotData.survey.sections).filter(
          isGroupSection,
        )
        const result = await validator.validate(
          questions,
          response.answers ?? {},
          {
            sections,
            language: response.language,
            defaultLanguage: snapshotData.survey.language?.default,
          },
        )
        if (!result.isValid) {
          throw new ServerErrorBadRequest({
            ref: 'SURVEY_RESPONSE_VALIDATION',
            key: 'error.responseValidationFailed',
            userMessage: 'Survey response validation failed.',
            errors: result.errors,
          })
        }
      }
    }

    if (existingResponse) {
      if (existingResponse.completed) {
        throw new ServerErrorForbidden({
          ref: 'SURVEY_COMPLETED',
          userMessage: 'The survey was completed already.',
        })
      }

      delete response.sessionId
      delete response.participantId
      delete response.snapshotId
      delete response.surveyId

      // Refresh publicationId to whatever the current JWT carries — an
      // unchanged-snapshot republish resolves to the new live publication,
      // so submission proceeds tagged with it rather than the stale one.
      response.publicationId = publicationId

      // Merge incoming randomisation seeds rather than overwriting — seeds must
      // never be deleted once set so that any question order can be reproduced.
      const incomingSeeds = response.randomSeeds || {}
      delete response.randomSeeds
      const mergedSeeds = {
        ...existingResponse.randomSeeds,
        ...incomingSeeds,
      }

      response.completed = isCompleting

      if (anonymous) {
        // No real time is recorded for an anonymous survey — every timestamp
        // is the fixed sentinel so it cannot be correlated with any external
        // record of when the participant took the survey.
        response.createdAt = anonymisedTimestamp()
        response.updatedAt = anonymisedTimestamp()
        response.startedAt =
          existingResponse.startedAt ??
          (isFirstAnswer ? anonymisedTimestamp() : null)
        response.completedAt = isCompleting ? anonymisedTimestamp() : null
        response.ip = null
        response.referrerUrl = null
      } else {
        response.completedAt =
          isCompleting && snapshotData?.survey?.data?.timestamp
            ? new Date()
            : null
        response.startedAt =
          existingResponse.startedAt ?? (isFirstAnswer ? new Date() : null)
      }

      await repo.updateOne(
        query,
        { $set: { ...response, randomSeeds: mergedSeeds } },
        { context },
      )
    } else {
      // An anonymous survey never records the participant id — the opaque
      // sessionId is the only identifier stored on the response.
      response.sessionId = sessionId
      response.participantId = anonymous ? null : participantId
      response.snapshotId = snapshotId
      response.publicationId = publicationId
      response.surveyId = surveyId

      const dataSettings = snapshotData?.survey?.data
      if (!anonymous && dataSettings?.ip && ip) {
        response.ip = dataSettings.anonymiseIp ? truncateIp(ip) : ip
      }
      if (!anonymous && dataSettings?.referrerUrl && referrerUrl) {
        response.referrerUrl = referrerUrl
      }

      response.completed = isCompleting

      if (anonymous) {
        response.ip = null
        response.referrerUrl = null
        response.createdAt = anonymisedTimestamp()
        response.updatedAt = anonymisedTimestamp()
        response.startedAt = isFirstAnswer ? anonymisedTimestamp() : null
        response.completedAt = isCompleting ? anonymisedTimestamp() : null
      } else {
        response.completedAt =
          isCompleting && dataSettings?.timestamp ? new Date() : null
        response.startedAt = isFirstAnswer ? new Date() : null
      }

      await repo.insertOne(response, { context })
    }

    if (isFirstAnswer) {
      await this.onResponseFirstAnswerRecorded(projectId)
    }

    if (response.completed) {
      await this.modelManager.services.eventLog.log({
        projectId,
        action: 'response.submitted',
        userId: aclContext.participantId,
        metadata: { surveyId, publicationId, snapshotId },
      })

      try {
        const serviceSurveyCompletionEmail =
          this.getService<ServiceSurveyCompletionEmail>('surveyCompletionEmail')
        await serviceSurveyCompletionEmail.sendCompletionEmails({
          projectId,
          surveyId,
          snapshotId,
          participantId,
          sessionId,
          response,
        })
      } catch (error) {
        // Completion emails must never fail the participant's submission.
        this.logger.log('Failed to send survey completion emails', {
          error,
          surveyId,
          projectId,
        })
      }
    }

    return response
  }

  getIdData(aclContext) {
    const { participantId, sessionId } = aclContext
    const idData =
      (participantId && { participantId }) ||
      (sessionId && { sessionId }) ||
      null
    if (!idData) {
      throw new ServerErrorBadRequest({
        message: 'No session id or participant id specified',
      })
    }
    return idData
  }
}

export default ServiceSurveyParticipantResponse
