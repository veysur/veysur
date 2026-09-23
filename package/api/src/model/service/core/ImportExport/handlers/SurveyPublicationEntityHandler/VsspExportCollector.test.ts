import type {
  RepoSurveyPublication,
  RepoSurveySnapshotPartial,
  RepoSurveySnapshot,
  RepoSurveyResponse,
  RepoFile,
} from 'model'
import { VsspExportCollector } from './VsspExportCollector'
import { MAX_RESPONSE_EXPORT_FILE_COUNT } from '../util/responseFileExportLimits'

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
        filename: `${_id}.pdf`,
        filePath: `files/${_id}.pdf`,
        mimeType: 'application/pdf',
        hash: `hash-${_id}`,
        size: 100,
      }),
    )

    const result = (await collector.collect(surveyId, baseContext, {
      publicationId,
    })) as { responseFileEntries: { fileId: string; zipPath: string }[] }

    expect(result.responseFileEntries).toHaveLength(2)
    const fileIds = result.responseFileEntries.map((e) => e.fileId).sort()
    expect(fileIds).toEqual(['file-a', 'file-b'])
    expect(
      result.responseFileEntries.find((e) => e.fileId === 'file-a')?.zipPath,
    ).toBe('files/response/file-a.pdf')
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
