import { Service, ServerErrorNotFound } from 'mzen-server'

import { RepoFile } from 'model'
import { contextForProject } from 'common'

export class ServiceFile extends Service {
  constructor() {
    super({
      name: 'file',
    })
  }

  /**
   * Get file metadata
   */
  async getOne({ fileId, projectId }) {
    const context = contextForProject(projectId)
    const repo = this.getRepo<RepoFile>('file')

    const file = await repo.findOne(
      {
        _id: fileId,
        uploadedAt: { $ne: null },
        deletedAt: null,
      },
      { context },
    )
    if (!file) {
      throw new ServerErrorNotFound('File not found')
    }

    return file
  }

  /**
   * List files for a project
   */
  async getAll({ projectId, page = 1, perPage = 50 }) {
    const context = contextForProject(projectId)
    const repo = this.getRepo<RepoFile>('file')

    const skip = (page - 1) * perPage
    const filter = {
      uploadedAt: { $ne: null }, // Only return completed uploads
      deletedAt: null, // Only return active files (not soft-deleted)
    }

    const files = await repo.find(filter, {
      context,
      sort: { createdAt: -1 },
      skip,
      limit: perPage,
    })

    const total = await repo.count(filter, { context })

    return {
      files,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    }
  }

  /**
   * Get files for a survey (fileContext = 'survey')
   */
  async getFilesForSurvey({ surveyId, projectId, page, perPage }) {
    const context = contextForProject(projectId)
    const repo = this.getRepo<RepoFile>('file')

    const { files, total } = await repo.findBySurvey(
      surveyId,
      {
        page,
        perPage,
      },
      { context },
    )

    return {
      files,
      pagination: {
        page: page || 1,
        perPage: perPage || 50,
        total,
        totalPages: Math.ceil(total / (perPage || 50)),
      },
    }
  }

  /**
   * Get files for a response (fileContext = 'response')
   */
  async getFilesForResponse({
    surveyId,
    responseId,
    projectId,
    page,
    perPage,
    requestHost,
    requestProto,
  }: {
    surveyId: string
    responseId: string
    projectId: string
    page?: number
    perPage?: number
    requestHost?: string
    requestProto?: string
  }) {
    const context = contextForProject(projectId)
    const repo = this.getRepo<RepoFile>('file')

    const { files, total } = await repo.findByResponse(
      surveyId,
      responseId,
      {
        page,
        perPage,
      },
      { context },
    )

    const baseUrl =
      requestHost && requestProto ? `${requestProto}://${requestHost}` : ''
    const filesWithUrl = files.map((file) => ({
      ...file,
      url: file.getUrl(baseUrl),
    }))

    return {
      files: filesWithUrl,
      pagination: {
        page: page || 1,
        perPage: perPage || 50,
        total,
        totalPages: Math.ceil(total / (perPage || 50)),
      },
    }
  }

  /**
   * Get file URL (public accessible through nginx proxy)
   */
  getFileUrl({ file, baseUrl }) {
    return file.getUrl(baseUrl)
  }
}

export default ServiceFile
