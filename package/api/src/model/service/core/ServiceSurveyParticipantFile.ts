import {
  Service,
  ServerErrorBadRequest,
  ServerErrorForbidden,
  ServerErrorNotFound,
} from 'mzen-server'
import {
  isSurveyQuestion,
  getFileUploadAnswerFileIds,
  QUESTION_TYPE_FILE_UPLOAD,
  FileUploadOptions,
} from 'veysur-common'

import { RepoSurveyResponse, RepoSurveySnapshot, RepoFile } from 'model'
import { AclContext } from 'model/entity/AclContext'
import { contextForProject } from 'common'
import {
  ServiceFileUpload,
  GenerateUploadUrlResult,
} from './ServiceFile/ServiceFileUpload'
import { FileReference } from './ServiceFile/FileReference'

/**
 * Participant-facing file upload for `fileUpload` question answers.
 *
 * Every scoping identifier (surveyId, snapshotId, participantId/sessionId,
 * projectId) is taken from `aclContext`, which the participant ACL role
 * assessor populates from the verified participant JWT — never from the
 * request body — mirroring `ServiceSurveyParticipantResponse`. A file can
 * only be uploaded against, or confirmed for, the caller's own in-progress
 * response for the survey their JWT names.
 */
export class ServiceSurveyParticipantFile extends Service {
  constructor() {
    super({ name: 'surveyParticipantFile' })
  }

  private getIdData(aclContext: AclContext & Record<string, unknown>) {
    const participantId = aclContext.participantId as string | undefined
    const sessionId = aclContext['sessionId'] as string | undefined
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

  private resolveFileUploadOptions(
    snapshot: { survey?: { elements?: { getByCode(code: string): unknown } } },
    questionCode: string,
  ): FileUploadOptions {
    const question = snapshot.survey?.elements?.getByCode(questionCode)
    if (
      !question ||
      !isSurveyQuestion(question) ||
      question.type !== QUESTION_TYPE_FILE_UPLOAD
    ) {
      throw new ServerErrorBadRequest(
        `questionCode "${questionCode}" does not refer to a file upload question`,
      )
    }
    const options = question.attributes?.fileUploadOptions
    if (!options) {
      throw new ServerErrorBadRequest(
        `File upload question "${questionCode}" is missing its options`,
      )
    }
    return options
  }

  /**
   * Issue a signed upload URL for a file answering a `fileUpload` question on
   * the caller's own in-progress response. The response must already exist
   * (created via a prior `saveSurveyParticipantResponse` call, even with an
   * empty `answers` object) — this endpoint never creates a response itself,
   * so response creation stays owned by a single code path.
   */
  async generateUploadUrl({
    filename,
    fileHash,
    fileSize,
    mimeType,
    questionCode,
    requestHost,
    requestProto,
    aclContext,
  }: {
    filename: string
    fileHash: string
    fileSize: number
    mimeType: string
    questionCode: string
    requestHost?: string
    requestProto?: string
    aclContext: AclContext & Record<string, unknown>
  }): Promise<GenerateUploadUrlResult> {
    const { surveyId, snapshotId, projectId } = aclContext as {
      surveyId: string
      snapshotId: string
      projectId: string
    }
    const idData = this.getIdData(aclContext)
    const context = contextForProject(projectId)

    const repoSnapshot = this.getRepo<RepoSurveySnapshot>('surveySnapshot')
    const snapshot = await repoSnapshot.findOne({ snapshotId }, { context })
    if (!snapshot) {
      throw new ServerErrorNotFound('Survey snapshot not found')
    }

    const options = this.resolveFileUploadOptions(snapshot, questionCode)
    if (fileSize > options.maxFileSize) {
      throw new ServerErrorBadRequest(
        `File size exceeds the ${options.maxFileSize} byte limit for this question`,
      )
    }
    if (!options.allowedMimeTypes.includes(mimeType)) {
      throw new ServerErrorBadRequest(
        `mimeType "${mimeType}" is not allowed for this question`,
      )
    }

    const repoResponse = this.getRepo<RepoSurveyResponse>('surveyResponse')
    const response = await repoResponse.findOne(
      { surveyId, snapshotId, ...idData },
      { context },
    )
    if (!response) {
      throw new ServerErrorBadRequest(
        'No in-progress response found — save an answer before uploading a file',
      )
    }
    if (response.completed) {
      throw new ServerErrorForbidden({
        ref: 'SURVEY_COMPLETED',
        userMessage: 'The survey was completed already.',
      })
    }

    const existingFileIds = getFileUploadAnswerFileIds(
      response.answers?.[questionCode],
    )
    if (existingFileIds.length >= options.maxFileCount) {
      throw new ServerErrorBadRequest(
        `This question allows at most ${options.maxFileCount} file(s)`,
      )
    }

    const fileUploadService = this.getService<ServiceFileUpload>('fileUpload')
    return fileUploadService.generateUploadUrl({
      projectId,
      requestHost,
      requestProto,
      filename,
      fileHash,
      fileSize,
      mimeType,
      surveyId,
      responseId: response._id,
      fileContext: 'response',
      // Participant JWTs carry no `_id` (only participantId/sessionId) —
      // stand in the caller's own identifier as the upload's createdById.
      aclContext: {
        ...aclContext,
        jwt: { _id: idData.participantId || idData.sessionId },
      },
    })
  }

  /**
   * Confirm a participant file upload, re-verifying that the file belongs to
   * the caller's own response before delegating to the shared confirm logic
   * — a participant must never be able to confirm (and thereby reference)
   * a file uploaded against someone else's response.
   */
  async confirmUpload({
    fileId,
    aclContext,
  }: {
    fileId: string
    aclContext: AclContext & Record<string, unknown>
  }) {
    const { surveyId, projectId } = aclContext as {
      surveyId: string
      projectId: string
    }
    const idData = this.getIdData(aclContext)
    const context = contextForProject(projectId)

    const repoFile = this.getRepo<RepoFile>('file')
    const file = await repoFile.findOne({ _id: fileId }, { context })
    if (!file) {
      throw new ServerErrorNotFound('File not found')
    }
    if (
      file.surveyId !== surveyId ||
      file.fileContext !== 'response' ||
      !file.responseId
    ) {
      throw new ServerErrorForbidden('File does not belong to this survey')
    }

    const repoResponse = this.getRepo<RepoSurveyResponse>('surveyResponse')
    const response = await repoResponse.findOne(
      { _id: file.responseId, surveyId, ...idData },
      { context },
    )
    if (!response) {
      throw new ServerErrorForbidden('File does not belong to your response')
    }

    const fileUploadService = this.getService<ServiceFileUpload>('fileUpload')
    const result = await fileUploadService.confirmUpload({
      fileId,
      projectId,
      aclContext,
    })

    await FileReference.addFileReference(
      repoFile,
      fileId,
      'response',
      file.responseId,
      context,
    )

    return result
  }
}

export default ServiceSurveyParticipantFile
