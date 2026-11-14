import { Service, ServerErrorNotFound } from '@datacapy/server'

import { RepoFile } from 'model'
import {
  contextForProject,
  createStorageAdaptor,
  generateSignedDownloadUrl,
} from 'common'
import { getStorageConfig } from './FileS3Config'
import type { tagsEndpoint as e } from '@datacapy/server'

const DOWNLOAD_URL_EXPIRES_IN_SECONDS = 300

/** @endpoints file path=/file */
export class ServiceFile extends Service {
  constructor() {
    super({
      name: 'file',
    })
  }

  /**
   * List files for a project
   * @route get /
   * @endpoint getAllFile
   * @acl projectAdmin
   */
  async getAll({
    projectId,
    page = 1,
    perPage = 50,
  }: {
    projectId: string & e.Header<'X-Project-Id'>
    page?: number & e.Query & e.Default<1>
    perPage?: number & e.Query & e.Default<50>
  }) {
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
   * Get file metadata
   * @route get /:fileId
   * @endpoint getFile
   * @acl projectAdmin
   */
  async getOne({
    fileId,
    projectId,
  }: {
    fileId: string & e.Param
    projectId: string & e.Header<'X-Project-Id'>
  }) {
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
   * Get files for a survey (fileContext = 'survey')
   * @route get /survey/:surveyId
   * @endpoint getFilesBySurvey
   * @acl projectAdmin
   */
  async getFilesForSurvey({
    surveyId,
    projectId,
    page,
    perPage,
  }: {
    surveyId: string & e.Param
    projectId: string & e.Header<'X-Project-Id'>
    page?: number & e.Query & e.Default<1>
    perPage?: number & e.Query & e.Default<50>
  }) {
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
   * @route get /survey/:surveyId/response/:responseId
   * @endpoint getFilesByResponse
   * @acl projectAdmin
   */
  async getFilesForResponse({
    surveyId,
    responseId,
    projectId,
    page,
    perPage,
  }: {
    surveyId: string & e.Param
    responseId: string & e.Param
    projectId: string & e.Header<'X-Project-Id'>
    page?: number & e.Query & e.Default<1>
    perPage?: number & e.Query & e.Default<50>
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
   * Get file URL (public accessible through nginx proxy)
   */
  getFileUrl({ file, baseUrl }) {
    return file.getUrl(baseUrl)
  }

  /**
   * Generate a presigned download URL for a file on demand - works for either
   * bucketType, so it serves both new private-bucket files and pre-existing
   * public-bucket ones through the same call.
   * @route get /:fileId/download-url
   * @endpoint getFileDownloadUrl
   * @acl projectAdmin
   */
  async generateDownloadUrl({
    fileId,
    projectId,
    requestHost,
    requestProto,
  }: {
    fileId: string & e.Param
    projectId: string & e.Header<'X-Project-Id'>
    requestHost?: string & e.Header<'X-Forwarded-Host'>
    requestProto?: string & e.Header<'X-Forwarded-Proto'>
  }) {
    const context = contextForProject(projectId)
    const repo = this.getRepo<RepoFile>('file')

    const file = await repo.findOne(
      { _id: fileId, uploadedAt: { $ne: null }, deletedAt: null },
      { context },
    )
    if (!file) {
      throw new ServerErrorNotFound('File not found')
    }

    const storageConfig = getStorageConfig(this.config)
    const effectiveConfig =
      requestHost && requestProto
        ? {
            ...storageConfig,
            publicBaseUrl: `${requestProto}://${requestHost}`,
          }
        : storageConfig
    const adaptor = createStorageAdaptor(effectiveConfig)
    const bucketType = file.bucketType || 'public'
    const bucket =
      bucketType === 'private'
        ? effectiveConfig.privateBucket
        : effectiveConfig.publicBucket

    const downloadUrl = await generateSignedDownloadUrl(
      effectiveConfig,
      adaptor,
      bucket,
      file.filePath,
      { expiresIn: DOWNLOAD_URL_EXPIRES_IN_SECONDS, filename: file.filename },
    )

    return {
      downloadUrl,
      expiresAt: new Date(Date.now() + DOWNLOAD_URL_EXPIRES_IN_SECONDS * 1000),
    }
  }
}

export default ServiceFile
