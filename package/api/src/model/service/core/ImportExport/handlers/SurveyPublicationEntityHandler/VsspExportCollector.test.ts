import type {
  RepoSurveyPublication,
  RepoSurveySnapshotPartial,
  RepoSurveySnapshot,
  RepoSurveyResponse,
  RepoFile,
} from 'model'
import { createStorageAdaptor } from 'common'
import { VsspExportCollector } from './VsspExportCollector'
import { MAX_RESPONSE_EXPORT_FILE_COUNT } from '../util/responseFileExportLimits'

jest.mock('common', () => ({
  ...jest.requireActual('common'),
  createStorageAdaptor: jest.fn(),
}))

describe('VsspExportCollector — response file bundling', () => {
  let mockRepoSurveyPublication: { findOne: jest.Mock }
  let mockRepoSurveySnapshotPartial: { findOne: jest.Mock }
  let mockRepoSurveySnapshot: { findOne: jest.Mock }
  let mockRepoSurveyResponse: { find: jest.Mock }
  let mockRepoFile: { findOne: jest.Mock }
  let collector: VsspExportCollector

  const projectId = 'project-1'
  const surveyId = 'survey-1'
  const publicationId = 'publication-1'
  const snapshotId = 'snapshot-1'

  const baseContext = {
    projectId,
    aclConditions: {},
    aclContext: { jwt: { _id: 'user-1' } },
  }

  beforeEach(() => {
    jest.clearAllMocks()

    mockRepoSurveyPublication = {
      findOne: jest.fn().mockResolvedValue({ _id: publicationId, snapshotId }),
    }
    mockRepoSurveySnapshotPartial = {
      findOne: jest.fn().mockResolvedValue({ _id: snapshotId }),
    }
    mockRepoSurveySnapshot = {
      findOne: jest.fn().mockResolvedValue({
        survey: { elements: { questionList: () => [] } },
      }),
    }
    mockRepoSurveyResponse = { find: jest.fn().mockResolvedValue([]) }
    mockRepoFile = { findOne: jest.fn() }

    collector = new VsspExportCollector(
      mockRepoSurveyPublication as unknown as RepoSurveyPublication,
      mockRepoSurveySnapshotPartial as unknown as RepoSurveySnapshotPartial,
      mockRepoSurveySnapshot as unknown as RepoSurveySnapshot,
      mockRepoSurveyResponse as unknown as RepoSurveyResponse,
      undefined,
      mockRepoFile as unknown as RepoFile,
      { publicBucket: 'public', privateBucket: 'private' } as never,
    )
  })

  test('bundles a manifest entry for each fileUpload answer referenced across responses', async () => {
    mockRepoSurveyResponse.find.mockResolvedValueOnce([
      {
        _id: 'response-1',
        answers: { q1: { fileIds: ['file-a', 'file-b'] } },
      },
    ])
    mockRepoFile.findOne.mockImplementation(({ _id }: { _id: string }) =>
      Promise.resolve({
        _id,
        responseId: 'response-1',
        filename: `${_id}.pdf`,
        filePath: `files/${_id}.pdf`,
        mimeType: 'application/pdf',
        hash: `hash-${_id}`,
        size: 100,
      }),
    )

    const result = (await collector.collect(surveyId, baseContext, {
      publicationId,
    })) as { responseFileEntries: { fileId: string; archiveEntryPath: string }[] }

    expect(result.responseFileEntries).toHaveLength(2)
    const fileIds = result.responseFileEntries.map((e) => e.fileId).sort()
    expect(fileIds).toEqual(['file-a', 'file-b'])
    expect(
      result.responseFileEntries.find((e) => e.fileId === 'file-a')?.archiveEntryPath,
    ).toBe('files/response/029/file-a.pdf')
  })

  test('carries the source file\'s bucketType onto the manifest entry, defaulting to public', async () => {
    mockRepoSurveyResponse.find.mockResolvedValueOnce([
      {
        _id: 'response-1',
        answers: { q1: { fileIds: ['file-private', 'file-public'] } },
      },
    ])
    mockRepoFile.findOne.mockImplementation(({ _id }: { _id: string }) =>
      Promise.resolve({
        _id,
        responseId: 'response-1',
        filename: `${_id}.pdf`,
        filePath: `files/${_id}.pdf`,
        mimeType: 'application/pdf',
        hash: `hash-${_id}`,
        size: 100,
        bucketType: _id === 'file-private' ? 'private' : undefined,
      }),
    )

    const result = (await collector.collect(surveyId, baseContext, {
      publicationId,
    })) as { responseFileEntries: { fileId: string; bucketType?: string }[] }

    expect(
      result.responseFileEntries.find((e) => e.fileId === 'file-private')
        ?.bucketType,
    ).toBe('private')
    expect(
      result.responseFileEntries.find((e) => e.fileId === 'file-public')
        ?.bucketType,
    ).toBe('public')
  })

  describe('makeBinaryFileStream', () => {
    let mockAdaptor: { getObject: jest.Mock }

    beforeEach(() => {
      mockAdaptor = {
        getObject: jest.fn().mockResolvedValue({ Body: 'stream' }),
      }
      ;(createStorageAdaptor as jest.Mock).mockReturnValue(mockAdaptor)
    })

    test('reads a private-bucket entry from the private bucket', async () => {
      const stream = collector.makeBinaryFileStream({
        s3Key: 'files/file-a.pdf',
        bucketType: 'private',
      })
      await stream()

      expect(mockAdaptor.getObject).toHaveBeenCalledWith(
        expect.objectContaining({ Bucket: 'private' }),
      )
    })

    test('reads a public (or unspecified bucketType) entry from the public bucket', async () => {
      const stream = collector.makeBinaryFileStream({
        s3Key: 'files/file-a.pdf',
      })
      await stream()

      expect(mockAdaptor.getObject).toHaveBeenCalledWith(
        expect.objectContaining({ Bucket: 'public' }),
      )
    })
  })

  test('skips a referenced file that no longer exists (soft-deleted or missing) without failing export', async () => {
    mockRepoSurveyResponse.find.mockResolvedValueOnce([
      { _id: 'response-1', answers: { q1: { fileIds: ['gone'] } } },
    ])
    mockRepoFile.findOne.mockResolvedValue(null)

    const result = (await collector.collect(surveyId, baseContext, {
      publicationId,
    })) as { responseFileEntries: unknown[] }

    expect(result.responseFileEntries).toHaveLength(0)
  })

  test('throws when the number of referenced response files exceeds the export guardrail', async () => {
    const manyFileIds = Array.from(
      { length: MAX_RESPONSE_EXPORT_FILE_COUNT + 1 },
      (_, i) => `file-${i}`,
    )
    mockRepoSurveyResponse.find.mockResolvedValueOnce([
      { _id: 'response-1', answers: { q1: { fileIds: manyFileIds } } },
    ])

    await expect(
      collector.collect(surveyId, baseContext, { publicationId }),
    ).rejects.toThrow()
  })

  test('does not bundle response files when repoFile/storageConfig are unavailable', async () => {
    const bareCollector = new VsspExportCollector(
      mockRepoSurveyPublication as unknown as RepoSurveyPublication,
      mockRepoSurveySnapshotPartial as unknown as RepoSurveySnapshotPartial,
      mockRepoSurveySnapshot as unknown as RepoSurveySnapshot,
      mockRepoSurveyResponse as unknown as RepoSurveyResponse,
    )
    mockRepoSurveyResponse.find.mockResolvedValueOnce([
      { _id: 'response-1', answers: { q1: { fileIds: ['file-a'] } } },
    ])

    const result = (await bareCollector.collect(surveyId, baseContext, {
      publicationId,
    })) as { responseFileEntries: unknown[] }

    expect(result.responseFileEntries).toEqual([])
  })
})

describe('VsspExportCollector.estimateSize', () => {
  let mockRepoSurveyPublication: { findOne: jest.Mock }
  let mockRepoSurveySnapshotPartial: { findOne: jest.Mock }
  let mockRepoSurveySnapshot: { findOne: jest.Mock }
  let mockRepoSurveyResponse: { find: jest.Mock }
  let mockRepoFile: { findOne: jest.Mock; find: jest.Mock }
  let collector: VsspExportCollector

  const projectId = 'project-1'
  const publicationId = 'publication-1'
  const snapshotId = 'snapshot-1'
  const imageSetId = 'imgset-1'

  const baseContext = {
    projectId,
    aclConditions: {},
    aclContext: { jwt: { _id: 'user-1' } },
  }

  const surveyWithAnswerOptionImage = {
    elements: {
      questionList: () => [
        {
          answerOptions: [{ image: { en: { fileId: 'file-original' } } }],
        },
      ],
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()

    mockRepoSurveyPublication = {
      findOne: jest.fn().mockResolvedValue({ _id: publicationId, snapshotId }),
    }
    mockRepoSurveySnapshotPartial = { findOne: jest.fn() }
    mockRepoSurveySnapshot = {
      findOne: jest
        .fn()
        .mockResolvedValue({ survey: surveyWithAnswerOptionImage }),
    }
    mockRepoSurveyResponse = { find: jest.fn().mockResolvedValue([]) }
    mockRepoFile = {
      findOne: jest
        .fn()
        .mockResolvedValue({ _id: 'file-original', imageSetId }),
      find: jest.fn().mockResolvedValue([
        { _id: 'file-original', imageVariant: 'original', size: 500_000 },
        { _id: 'file-thumb', imageVariant: 'thumb', size: 10_000 },
      ]),
    }

    collector = new VsspExportCollector(
      mockRepoSurveyPublication as unknown as RepoSurveyPublication,
      mockRepoSurveySnapshotPartial as unknown as RepoSurveySnapshotPartial,
      mockRepoSurveySnapshot as unknown as RepoSurveySnapshot,
      mockRepoSurveyResponse as unknown as RepoSurveyResponse,
      undefined,
      mockRepoFile as unknown as RepoFile,
      { publicBucket: 'public', privateBucket: 'private' } as never,
    )
  })

  test('sums the actual size of every embedded answer-option image variant', async () => {
    const size = await collector.estimateSize(baseContext, { publicationId })

    expect(size).toBe(510_000)
  })

  test('returns 0 without a publicationId', async () => {
    const size = await collector.estimateSize(baseContext)

    expect(size).toBe(0)
    expect(mockRepoSurveyPublication.findOne).not.toHaveBeenCalled()
  })

  test('returns 0 when the publication cannot be found', async () => {
    mockRepoSurveyPublication.findOne.mockResolvedValue(null)

    const size = await collector.estimateSize(baseContext, { publicationId })

    expect(size).toBe(0)
  })
})
