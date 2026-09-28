import type {
  RepoSurveyResponse,
  RepoSurveyPublication,
  RepoSurveySnapshot,
  RepoSurveySnapshotPartial,
  RepoSurvey,
  RepoSurveyParticipant,
  RepoSurveyElement,
  RepoSurveySection,
  RepoFile,
} from 'model'

import { SurveyPublicationEntityHandler } from './SurveyPublicationEntityHandler'
import type { EntityExportContext } from '../EntityHandlerInterface'
import type { FormatHandlerInterface } from '../format/FormatHandlerInterface'
import type { ResponseFileManifestEntry } from './SurveyPublicationEntityHandler/types'

describe('SurveyPublicationEntityHandler.estimateExportSize', () => {
  const projectId = 'project-1'
  const surveyId = 'survey-1'

  const baseContext: EntityExportContext = {
    projectId,
    aclConditions: {},
    aclContext: { jwt: { _id: 'user-1' } },
  }

  let mockRepoSurveyResponse: { count: jest.Mock }
  let mockRepoSurveyPublication: { find: jest.Mock; findOne: jest.Mock }
  let mockRepoSurveySnapshot: { findOne: jest.Mock }
  let mockRepoFile: { findOne: jest.Mock; find: jest.Mock }
  let handler: SurveyPublicationEntityHandler

  beforeEach(() => {
    mockRepoSurveyResponse = { count: jest.fn().mockResolvedValue(0) }
    mockRepoSurveyPublication = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
    }
    mockRepoSurveySnapshot = { findOne: jest.fn() }
    mockRepoFile = { findOne: jest.fn(), find: jest.fn() }

    handler = new SurveyPublicationEntityHandler(
      mockRepoSurveyResponse as unknown as RepoSurveyResponse,
      mockRepoSurveyPublication as unknown as RepoSurveyPublication,
      mockRepoSurveySnapshot as unknown as RepoSurveySnapshot,
      {} as RepoSurveySnapshotPartial,
      {} as RepoSurvey,
      {} as RepoSurveyParticipant,
      {} as RepoSurveyElement,
      {} as RepoSurveySection,
      undefined,
      mockRepoFile as unknown as RepoFile,
      { publicBucket: 'public', privateBucket: 'private' } as never,
    )
  })

  test('with a publicationId, only estimates that one publication', async () => {
    mockRepoSurveyResponse.count.mockResolvedValue(5)
    mockRepoSurveyPublication.findOne.mockResolvedValue({
      _id: 'pub-1',
      snapshotId: 'snap-1',
    })
    mockRepoSurveySnapshot.findOne.mockResolvedValue({
      survey: { elements: { questionList: () => [] } },
    })

    const size = await handler.estimateExportSize(surveyId, baseContext, {
      publicationId: 'pub-1',
    })

    expect(mockRepoSurveyPublication.find).not.toHaveBeenCalled()
    expect(size).toBe(5 * 2048)
  })

  test('without a publicationId (.vssa), sums every publication in the survey', async () => {
    mockRepoSurveyResponse.count.mockResolvedValue(0)
    mockRepoSurveyPublication.find.mockResolvedValue([
      { _id: 'pub-1' },
      { _id: 'pub-2' },
    ])
    mockRepoSurveyPublication.findOne.mockImplementation(
      ({ _id }: { _id: string }) =>
        Promise.resolve({ _id, snapshotId: `snap-${_id}` }),
    )
    mockRepoSurveySnapshot.findOne.mockImplementation(
      ({ snapshotId }: { snapshotId: string }) =>
        Promise.resolve({
          survey: {
            elements: {
              questionList: () => [
                {
                  answerOptions: [
                    { image: { en: { fileId: `file-${snapshotId}` } } },
                  ],
                },
              ],
            },
          },
        }),
    )
    mockRepoFile.findOne.mockImplementation(({ _id }: { _id: string }) =>
      Promise.resolve({ _id, imageSetId: `imgset-${_id}` }),
    )
    mockRepoFile.find.mockResolvedValue([
      { _id: 'variant', imageVariant: 'original', size: 100_000 },
    ])

    const size = await handler.estimateExportSize(surveyId, baseContext)

    expect(mockRepoSurveyPublication.find).toHaveBeenCalledWith(
      { surveyId },
      expect.anything(),
    )
    // Two publications, each contributing one 100_000-byte image.
    expect(size).toBe(200_000)
  })
})

describe('SurveyPublicationEntityHandler.prepareExportData — response file manifest bucketing', () => {
  let handler: SurveyPublicationEntityHandler
  let fakeFormatHandler: FormatHandlerInterface
  let serializedFiles: { filename: string; content?: string }[]

  function makeEntry(
    fileId: string,
    bucket: string,
  ): ResponseFileManifestEntry {
    return {
      fileId,
      filename: `${fileId}.pdf`,
      s3Key: `files/response/${fileId}.pdf`,
      mimeType: 'application/pdf',
      hash: null,
      size: 10,
      bucket,
      archiveEntryPath: `files/response/${bucket}/${fileId}.pdf`,
    }
  }

  beforeEach(() => {
    serializedFiles = []
    fakeFormatHandler = {
      format: 'vssp',
      extensions: ['.vssp'],
      serialize: (data: unknown) => {
        serializedFiles = data as { filename: string; content?: string }[]
        return { on: jest.fn(), pipe: jest.fn() } as never
      },
      parse: jest.fn(),
      getFilename: jest.fn(),
      getMimeType: jest.fn(),
    }

    handler = new SurveyPublicationEntityHandler(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      undefined,
      {} as never,
      { publicBucket: 'public', privateBucket: 'private' } as never,
    )
  })

  test('writes one manifest per distinct bucket, each containing only its own entries', async () => {
    const responseFileEntries = [
      makeEntry('file-a', '001'),
      makeEntry('file-b', '001'),
      makeEntry('file-c', '042'),
    ]

    await handler.prepareExportData(
      {
        publication: {},
        snapshotData: {},
        responseEntries: [],
        embeddedFileEntries: [],
        responseFileEntries,
      },
      fakeFormatHandler,
    )

    const manifestFiles = serializedFiles.filter((f) =>
      f.filename.startsWith('files/response-manifest-'),
    )
    expect(manifestFiles.map((f) => f.filename).sort()).toEqual([
      'files/response-manifest-001.json',
      'files/response-manifest-042.json',
    ])

    const bucket001 = JSON.parse(
      manifestFiles.find((f) => f.filename.endsWith('001.json')).content,
    )
    expect(bucket001.files.map((e: ResponseFileManifestEntry) => e.fileId)).toEqual(
      ['file-a', 'file-b'],
    )

    const bucket042 = JSON.parse(
      manifestFiles.find((f) => f.filename.endsWith('042.json')).content,
    )
    expect(bucket042.files.map((e: ResponseFileManifestEntry) => e.fileId)).toEqual(
      ['file-c'],
    )
  })

  test('writes no manifest when there are no response file entries', async () => {
    await handler.prepareExportData(
      {
        publication: {},
        snapshotData: {},
        responseEntries: [],
        embeddedFileEntries: [],
        responseFileEntries: [],
      },
      fakeFormatHandler,
    )

    const manifestFiles = serializedFiles.filter((f) =>
      f.filename.startsWith('files/response-manifest-'),
    )
    expect(manifestFiles).toHaveLength(0)
  })
})
