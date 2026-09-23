import { ServiceSurveyParticipantFile } from './ServiceSurveyParticipantFile'

describe('ServiceSurveyParticipantFile', () => {
  let service: ServiceSurveyParticipantFile
  let mockRepoSurveyResponse: { findOne: jest.Mock }
  let mockRepoSurveySnapshot: { findOne: jest.Mock }
  let mockRepoFile: { findOne: jest.Mock; updateOne: jest.Mock }
  let mockServiceFileUpload: {
    generateUploadUrl: jest.Mock
    confirmUpload: jest.Mock
  }

  const fileUploadQuestion = (overrides: Record<string, unknown> = {}) => ({
    code: 'q1',
    type: 'fileUpload',
    attributes: {
      fileUploadOptions: {
        maxFileSize: 1000,
        allowedMimeTypes: ['application/pdf'],
        maxFileCount: 1,
      },
      ...((overrides.attributes as Record<string, unknown>) ?? {}),
    },
  })

  const snapshotWithQuestion = (question = fileUploadQuestion()) => ({
    survey: {
      elements: {
        getByCode: (code: string) => (code === question.code ? question : undefined),
      },
    },
  })

  const aclContext = (overrides: Record<string, unknown> = {}) => ({
    surveyId: 'survey_1',
    snapshotId: 'snapshot_1',
    publicationId: 'pub_1',
    projectId: 'proj_1',
    participantId: 'participant_1',
    sessionId: undefined,
    ...overrides,
  })

  beforeEach(() => {
    jest.clearAllMocks()
    service = new ServiceSurveyParticipantFile()

    mockRepoSurveyResponse = { findOne: jest.fn() }
    mockRepoSurveySnapshot = { findOne: jest.fn() }
    mockRepoFile = {
      findOne: jest.fn(),
      updateOne: jest.fn().mockResolvedValue(undefined),
    }

    jest.spyOn(service, 'getRepo').mockImplementation(((name: string) => {
      const map: Record<string, unknown> = {
        surveyResponse: mockRepoSurveyResponse,
        surveySnapshot: mockRepoSurveySnapshot,
        file: mockRepoFile,
      }
      return map[name] ?? {}
    }) as typeof service.getRepo)

    mockServiceFileUpload = {
      generateUploadUrl: jest.fn().mockResolvedValue({
        fileId: 'file_1',
        uploadUrl: 'https://upload',
        existingFile: false,
      }),
      confirmUpload: jest.fn().mockResolvedValue({
        success: true,
        file: { _id: 'file_1' },
        alreadyConfirmed: false,
      }),
    }
    jest.spyOn(service, 'getService').mockImplementation(((name: string) => {
      const map: Record<string, unknown> = { fileUpload: mockServiceFileUpload }
      return map[name] ?? {}
    }) as typeof service.getService)
  })

  describe('generateUploadUrl', () => {
    test('rejects a questionCode that is not a fileUpload question', async () => {
      mockRepoSurveySnapshot.findOne.mockResolvedValue(
        snapshotWithQuestion({ ...fileUploadQuestion(), type: 'text' }),
      )

      await expect(
        service.generateUploadUrl({
          filename: 'a.pdf',
          fileHash: 'hash',
          fileSize: 10,
          mimeType: 'application/pdf',
          questionCode: 'q1',
          aclContext: aclContext(),
        }),
      ).rejects.toThrow()
    })

    test('rejects a file exceeding the question maxFileSize', async () => {
      mockRepoSurveySnapshot.findOne.mockResolvedValue(snapshotWithQuestion())

      await expect(
        service.generateUploadUrl({
          filename: 'a.pdf',
          fileHash: 'hash',
          fileSize: 5000,
          mimeType: 'application/pdf',
          questionCode: 'q1',
          aclContext: aclContext(),
        }),
      ).rejects.toThrow()
    })

    test('rejects a mimeType not in the question allowedMimeTypes', async () => {
      mockRepoSurveySnapshot.findOne.mockResolvedValue(snapshotWithQuestion())

      await expect(
        service.generateUploadUrl({
          filename: 'a.png',
          fileHash: 'hash',
          fileSize: 10,
          mimeType: 'image/png',
          questionCode: 'q1',
          aclContext: aclContext(),
        }),
      ).rejects.toThrow()
    })

    test('requires an existing in-progress response before issuing an upload URL', async () => {
      mockRepoSurveySnapshot.findOne.mockResolvedValue(snapshotWithQuestion())
      mockRepoSurveyResponse.findOne.mockResolvedValue(null)

      await expect(
        service.generateUploadUrl({
          filename: 'a.pdf',
          fileHash: 'hash',
          fileSize: 10,
          mimeType: 'application/pdf',
          questionCode: 'q1',
          aclContext: aclContext(),
        }),
      ).rejects.toThrow()

      expect(mockServiceFileUpload.generateUploadUrl).not.toHaveBeenCalled()
    })

    test('rejects uploading against an already-completed response', async () => {
      mockRepoSurveySnapshot.findOne.mockResolvedValue(snapshotWithQuestion())
      mockRepoSurveyResponse.findOne.mockResolvedValue({
        _id: 'response_1',
        completed: true,
        answers: {},
      })

      await expect(
        service.generateUploadUrl({
          filename: 'a.pdf',
          fileHash: 'hash',
          fileSize: 10,
          mimeType: 'application/pdf',
          questionCode: 'q1',
          aclContext: aclContext(),
        }),
      ).rejects.toMatchObject({ ref: 'SURVEY_COMPLETED' })
    })

    test('rejects once the question maxFileCount is already reached', async () => {
      mockRepoSurveySnapshot.findOne.mockResolvedValue(snapshotWithQuestion())
      mockRepoSurveyResponse.findOne.mockResolvedValue({
        _id: 'response_1',
        completed: false,
        answers: { q1: { fileIds: ['existing_file'] } },
      })

      await expect(
        service.generateUploadUrl({
          filename: 'a.pdf',
          fileHash: 'hash',
          fileSize: 10,
          mimeType: 'application/pdf',
          questionCode: 'q1',
          aclContext: aclContext(),
        }),
      ).rejects.toThrow()

      expect(mockServiceFileUpload.generateUploadUrl).not.toHaveBeenCalled()
    })

    test('delegates to ServiceFileUpload scoped to the caller response, never a client-supplied id', async () => {
      mockRepoSurveySnapshot.findOne.mockResolvedValue(snapshotWithQuestion())
      mockRepoSurveyResponse.findOne.mockResolvedValue({
        _id: 'response_1',
        completed: false,
        answers: {},
      })

      await service.generateUploadUrl({
        filename: 'a.pdf',
        fileHash: 'hash',
        fileSize: 10,
        mimeType: 'application/pdf',
        questionCode: 'q1',
        aclContext: aclContext(),
      })

      expect(mockServiceFileUpload.generateUploadUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          surveyId: 'survey_1',
          responseId: 'response_1',
          fileContext: 'response',
          projectId: 'proj_1',
        }),
      )
    })
  })

  describe('confirmUpload — cross-survey/response scoping', () => {
    test('rejects confirming a file that belongs to a different survey', async () => {
      mockRepoFile.findOne.mockResolvedValue({
        _id: 'file_1',
        surveyId: 'other_survey',
        fileContext: 'response',
        responseId: 'response_1',
      })

      await expect(
        service.confirmUpload({ fileId: 'file_1', aclContext: aclContext() }),
      ).rejects.toThrow()

      expect(mockServiceFileUpload.confirmUpload).not.toHaveBeenCalled()
    })

    test('rejects confirming a file whose response does not belong to the caller', async () => {
      mockRepoFile.findOne.mockResolvedValue({
        _id: 'file_1',
        surveyId: 'survey_1',
        fileContext: 'response',
        responseId: 'response_1',
      })
      // The caller's participantId/sessionId does not match any response record.
      mockRepoSurveyResponse.findOne.mockResolvedValue(null)

      await expect(
        service.confirmUpload({ fileId: 'file_1', aclContext: aclContext() }),
      ).rejects.toThrow()

      expect(mockServiceFileUpload.confirmUpload).not.toHaveBeenCalled()
    })

    test('confirms when the file belongs to the caller own response', async () => {
      mockRepoFile.findOne.mockResolvedValue({
        _id: 'file_1',
        surveyId: 'survey_1',
        fileContext: 'response',
        responseId: 'response_1',
      })
      mockRepoSurveyResponse.findOne.mockResolvedValue({ _id: 'response_1' })

      const result = await service.confirmUpload({
        fileId: 'file_1',
        aclContext: aclContext(),
      })

      expect(mockServiceFileUpload.confirmUpload).toHaveBeenCalledWith(
        expect.objectContaining({ fileId: 'file_1', projectId: 'proj_1' }),
      )
      expect(result.success).toBe(true)
    })
  })
})
