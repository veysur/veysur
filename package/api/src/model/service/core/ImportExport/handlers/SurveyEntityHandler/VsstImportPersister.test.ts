import type { RepoFile, RepoSurvey, RepoSurveyLanguage } from 'model'
import { VsstImportPersister } from './VsstImportPersister'
import type { EntityParsedData } from '../../EntityHandlerInterface'
import type { FileResolution, VsstResolvedContext } from './types'
import { mockRepoTransaction } from '../../../../../../test-utils/mockRepoTransaction'
import { createStorageAdaptor } from 'common'

jest.mock('common', () => ({
  ...jest.requireActual('common'),
  createStorageAdaptor: jest.fn().mockReturnValue({
    copyObject: jest.fn().mockResolvedValue(undefined),
  }),
}))

describe('VsstImportPersister — embedded answer-option image restoration', () => {
  let mockRepoSurvey: {
    getRepo: jest.Mock
    getDataSource: jest.Mock
    releaseDataSource: jest.Mock
    create: jest.Mock
    transaction: jest.Mock
  }
  let mockRepoFile: { create: jest.Mock; updateOne: jest.Mock }
  let persister: VsstImportPersister

  const projectId = 'project-1'
  const surveyId = 'new-survey-1'

  const mockParsedData: EntityParsedData = {
    getJson: jest.fn().mockReturnValue(null),
    getBinaryS3Key: jest.fn().mockReturnValue(null),
    listEntries: jest.fn().mockReturnValue([]),
    cleanup: jest.fn().mockResolvedValue(undefined),
    deleteJson: jest.fn(),
  }

  const fileResolution: FileResolution = {
    manifestEntry: {
      fileId: 'archive-file-1',
      filename: 'edited.jpg',
      s3Key: 'project-x/survey/old-survey/imgset-abc/edited.jpg',
      mimeType: 'image/jpeg',
      hash: 'hash-abc',
      size: 4321,
      archiveEntryPath: 'files/imgset-abc/edited.jpg',
      answerOptionId: 'ao-1',
      fileContext: 'survey',
      imageSetId: 'imgset-abc',
      imageVariant: 'edited',
    },
    existingFileId: null,
    newFileId: 'new-file-1',
    newFilePath: `project-${projectId}/survey/${surveyId}/imgset-abc/edited.jpg`,
    imageSetId: 'imgset-abc',
    imageVariant: 'edited',
    resurrect: false,
  }

  function buildResolvedContext(
    overrides: Partial<VsstResolvedContext> = {},
  ): VsstResolvedContext {
    return {
      survey: { _id: surveyId },
      sections: [],
      elements: [],
      surveyLanguages: [],
      participantAttributes: [],
      emailTemplates: [],
      embeddedFileEntries: [],
      parsedData: mockParsedData,
      fileResolutions: [fileResolution],
      imageSetIdMap: {},
      ...overrides,
    } as unknown as VsstResolvedContext
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(mockParsedData.getBinaryS3Key as jest.Mock).mockReturnValue(null)

    const mockDataSource = {
      transactionStart: jest.fn(),
      transactionCommit: jest.fn(),
      transactionRollback: jest.fn(),
    }
    mockDataSource.transactionStart.mockResolvedValue(mockDataSource)

    mockRepoSurvey = {
      getRepo: jest
        .fn()
        .mockReturnValue({ insertOne: jest.fn().mockResolvedValue(undefined) }),
      getDataSource: jest.fn().mockResolvedValue(mockDataSource),
      releaseDataSource: jest.fn(),
      create: jest.fn().mockResolvedValue(undefined),
      transaction: jest.fn(),
    }
    mockRepoSurvey.transaction = mockRepoTransaction(mockRepoSurvey)

    mockRepoFile = {
      create: jest.fn().mockResolvedValue(undefined),
      updateOne: jest.fn().mockResolvedValue(undefined),
    }

    persister = new VsstImportPersister(
      mockRepoSurvey as unknown as RepoSurvey,
      undefined as unknown as RepoSurveyLanguage,
      mockRepoFile as unknown as RepoFile,
      {
        type: 'local',
        publicBucket: 'public',
        privateBucket: 'private',
      } as never,
    )
  })

  test('copies the image and creates a File record when the archive entry is present', async () => {
    ;(mockParsedData.getBinaryS3Key as jest.Mock).mockReturnValue(
      'staging/imgset-abc/edited.jpg',
    )
    const mockAdaptor = (createStorageAdaptor as jest.Mock)({} as never) as {
      copyObject: jest.Mock
    }

    const result = await persister.persist(buildResolvedContext(), {
      projectId,
      aclContext: { jwt: { _id: 'user-1' } },
    })

    expect(mockAdaptor.copyObject).toHaveBeenCalledTimes(1)
    expect(mockRepoFile.create).toHaveBeenCalledTimes(1)
    const createdFile = mockRepoFile.create.mock.calls[0][0]
    expect(createdFile._id).toBe('new-file-1')
    expect(createdFile.hash).toBe('hash-abc')
    expect(result.warnings).toBeUndefined()
  })

  test('does not create a File record and reports a warning when the archive entry is missing', async () => {
    const result = await persister.persist(buildResolvedContext(), {
      projectId,
      aclContext: { jwt: { _id: 'user-1' } },
    })

    expect(mockRepoFile.create).not.toHaveBeenCalled()
    expect(result.warnings).toEqual([
      {
        message:
          '1 embedded image(s) could not be restored from the archive and were skipped: edited.jpg',
      },
    ])
  })

  test('resurrects a soft-deleted File instead of copying or creating a duplicate', async () => {
    const resurrectResolution: FileResolution = {
      ...fileResolution,
      existingFileId: 'existing-file-99',
      resurrect: true,
    }

    const result = await persister.persist(
      buildResolvedContext({ fileResolutions: [resurrectResolution] }),
      { projectId, aclContext: { jwt: { _id: 'user-1' } } },
    )

    expect(mockRepoFile.create).not.toHaveBeenCalled()
    expect(mockRepoFile.updateOne).toHaveBeenCalledWith(
      { _id: 'existing-file-99' },
      { $set: { deletedAt: null } },
      expect.anything(),
    )
    expect(result.warnings).toBeUndefined()
  })
})
