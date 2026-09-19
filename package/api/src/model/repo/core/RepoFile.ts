import { Repo, ServerErrorBadRequest, TYPE_HINT_TIMESTAMP } from 'mzen-server'
import { File } from 'veysur-common'

const FILE_CONTEXT_SURVEY = 'survey'
const FILE_CONTEXT_RESPONSE = 'response'

export class RepoFile extends Repo<File> {
  constructor() {
    super({
      name: 'file',
      dataSource: 'project', // Use project-specific dynamic datasource
      autoIndex: false,
      relations: {},
      indexes: {
        createdAt: {
          spec: { createdAt: -1 },
          options: { typeHint: { createdAt: TYPE_HINT_TIMESTAMP } },
        },
        updatedAt: {
          spec: { updatedAt: -1 },
          options: { typeHint: { updatedAt: TYPE_HINT_TIMESTAMP } },
        },
        createdById: {
          spec: { createdById: 1, createdAt: -1 },
          options: { typeHint: { createdAt: TYPE_HINT_TIMESTAMP } },
        },
        uploadedAt: {
          spec: { uploadedAt: -1 },
          options: { typeHint: { uploadedAt: TYPE_HINT_TIMESTAMP } },
        },
        deletedAt: {
          spec: { deletedAt: -1 },
          options: { typeHint: TYPE_HINT_TIMESTAMP },
        },
        hash: {
          spec: { hash: 1 },
        },
        filePath: {
          spec: { filePath: 1 },
        },
        surveyId: {
          spec: { surveyId: 1, createdAt: -1 },
          options: { typeHint: { createdAt: TYPE_HINT_TIMESTAMP } },
        },
        responseId: {
          spec: { surveyId: 1, responseId: 1, createdAt: -1 },
          options: { typeHint: { createdAt: TYPE_HINT_TIMESTAMP } },
        },
        fileContext: {
          spec: { fileContext: 1, deletedAt: 1 },
          options: { typeHint: { deletedAt: TYPE_HINT_TIMESTAMP } },
        },
      },
    })
  }

  async create(fileData, options?) {
    this.initSchema()
    const { isValid, errors } = await this.schema.validatePaths(fileData)
    if (!isValid) {
      console.error('File validation failed:', JSON.stringify(errors, null, 2))
      console.error('File data:', JSON.stringify(fileData, null, 2))
      throw new ServerErrorBadRequest(errors)
    }

    await this.schema.applyFilters(fileData)
    const file = new File(fileData)
    await this.insertOne(file, options)

    return file
  }

  /**
   * Find existing file by content hash (for deduplication)
   */
  async findByHash(hash: string): Promise<File | null> {
    return await this.findOne({ hash })
  }

  /**
   * Find existing file by content hash with exact context match
   * Returns both the file (if found) and whether the context matches
   *
   * Context matching logic:
   * - Project context: no surveyId, no responseId, fileContext='project' or null
   * - Survey context: surveyId matches, no responseId, fileContext='survey'
   * - Response context: surveyId matches, responseId matches, fileContext='response'
   */
  async findByHashWithContext(
    hash: string,
    fileContext: {
      surveyId?: string | null
      responseId?: string | null
      type?: InstanceType<typeof File>['fileContext']
    },
    options?,
  ): Promise<{ file: File | null; contextMatches: boolean }> {
    // Build query for EXACT context match
    const query: Pick<
      File,
      'hash' | 'surveyId' | 'responseId' | 'fileContext'
    > & {
      $or?: Array<Pick<File, 'fileContext'>>
    } = { hash }

    const inputSurveyId = fileContext.surveyId || null
    const inputResponseId = fileContext.responseId || null
    const inputContextType = fileContext.type || null

    if (
      inputContextType === FILE_CONTEXT_RESPONSE &&
      inputSurveyId &&
      inputResponseId
    ) {
      query.surveyId = inputSurveyId
      query.responseId = inputResponseId
      query.fileContext = FILE_CONTEXT_RESPONSE
    } else if (inputContextType === FILE_CONTEXT_SURVEY && inputSurveyId) {
      query.surveyId = inputSurveyId
      query.responseId = null
      query.fileContext = FILE_CONTEXT_SURVEY
    } else {
      query.surveyId = null
      query.responseId = null
      query.$or = [{ fileContext: fileContext.type || null }]
    }

    const file = await this.findOne(query, options)
    return { file, contextMatches: file ? true : false }
  }

  /**
   * Find existing image set file by hash of the edited variant (for deduplication)
   */
  async findByImageSetHash(
    hash: string,
    surveyId: string | null,
    fileContext: InstanceType<typeof File>['fileContext'] | null,
    options?,
  ): Promise<File | null> {
    return await this.findOne(
      {
        hash,
        imageVariant: 'edited',
        surveyId: surveyId ?? null,
        fileContext: fileContext ?? null,
      },
      options,
    )
  }

  /**
   * Find file by path
   */
  async findByPath(filePath: string): Promise<File | null> {
    return await this.findOne({ filePath })
  }

  /**
   * Find files by survey (fileContext = 'survey')
   */
  async findBySurvey(
    surveyId: string,
    pagination?: { page?: number; perPage?: number },
    options?,
  ): Promise<{ files: File[]; total: number }> {
    const page = pagination?.page || 1
    const perPage = pagination?.perPage || 50
    const skip = (page - 1) * perPage

    const files = await this.find(
      { surveyId, fileContext: FILE_CONTEXT_SURVEY, deletedAt: null },
      { ...options, sort: { createdAt: -1 }, skip, limit: perPage },
    )

    const total = await this.count(
      {
        surveyId,
        fileContext: FILE_CONTEXT_SURVEY,
        deletedAt: null,
      },
      options,
    )

    return { files, total }
  }

  /**
   * Find files by response (fileContext = 'response')
   */
  async findByResponse(
    surveyId: string,
    responseId: string,
    pagination?: { page?: number; perPage?: number },
    options?,
  ): Promise<{ files: File[]; total: number }> {
    const page = pagination?.page || 1
    const perPage = pagination?.perPage || 50
    const skip = (page - 1) * perPage

    const files = await this.find(
      {
        surveyId,
        responseId,
        fileContext: FILE_CONTEXT_RESPONSE,
        deletedAt: null,
      },
      { ...options, sort: { createdAt: -1 }, skip, limit: perPage },
    )

    const total = await this.count(
      {
        surveyId,
        responseId,
        fileContext: FILE_CONTEXT_RESPONSE,
        deletedAt: null,
      },
      options,
    )

    return { files, total }
  }

  /**
   * Count File records with same hash (for safe deletion)
   * Used to determine if S3 object can be deleted
   */
  async countReferences(hash: string): Promise<number> {
    return await this.count({ hash })
  }

  /**
   * Find all files for a survey
   */
  async findAllBySurveyId(surveyId: string): Promise<File[]> {
    return await this.find({ surveyId, fileContext: FILE_CONTEXT_SURVEY })
  }

  /**
   * Find all files for a response
   */
  async findAllByResponseId(
    surveyId: string,
    responseId: string,
  ): Promise<File[]> {
    return await this.find({
      surveyId,
      responseId,
      fileContext: FILE_CONTEXT_RESPONSE,
    })
  }

  /**
   * Delete all files for a survey
   */
  async deleteBySurveyId(surveyId: string): Promise<number> {
    const query = { surveyId, fileContext: FILE_CONTEXT_SURVEY }
    const toDelete = await this.find(query)
    const deletedCount = toDelete.length
    await this.deleteMany(query)
    return deletedCount
  }

  /**
   * Delete all files for a response
   */
  async deleteByResponseId(
    surveyId: string,
    responseId: string,
  ): Promise<number> {
    const query = { surveyId, responseId, fileContext: FILE_CONTEXT_RESPONSE }
    const toDelete = await this.find(query)
    const deletedCount = toDelete.length
    await this.deleteMany(query)
    return deletedCount
  }
}

export default RepoFile
