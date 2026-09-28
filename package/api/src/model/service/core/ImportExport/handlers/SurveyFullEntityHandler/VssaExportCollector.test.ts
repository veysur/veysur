import { Survey } from 'veysur-common'

import { createStorageAdaptor } from 'common'
import type { RepoSurveyPublication } from 'model'
import type { SurveyEntityHandler } from '../SurveyEntityHandler'
import type { SurveyPublicationEntityHandler } from '../SurveyPublicationEntityHandler'
import type { ResponseFileManifestEntry } from '../SurveyPublicationEntityHandler/types'
import { VssaExportCollector } from './VssaExportCollector'

jest.mock('../util/responseFileExportLimits', () => ({
  MAX_RESPONSE_EXPORT_FILE_COUNT: 5,
  MAX_RESPONSE_EXPORT_TOTAL_SIZE: 1000,
}))

jest.mock('common', () => ({
  ...jest.requireActual('common'),
  createStorageAdaptor: jest.fn(),
}))

function makeSurvey(): Survey {
  return new Survey({
    _id: 'survey-1',
    createdById: 'u1',
    name: 'Full export survey',
    language: { default: 'en', options: ['en'] },
  })
}

function makeResponseFileEntries(
  count: number,
  size: number,
  bucketType?: 'public' | 'private',
): ResponseFileManifestEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    fileId: `file-${i}`,
    filename: `file-${i}.pdf`,
    s3Key: `files/response/file-${i}.pdf`,
    mimeType: 'application/pdf',
    hash: null,
    size,
    bucket: '000',
    archiveEntryPath: `files/response/000/file-${i}.pdf`,
    bucketType,
  }))
}

describe('VssaExportCollector: aggregate file guardrail across publications', () => {
  const projectId = 'project-1'
  const surveyId = 'survey-1'
  const baseContext = {
    projectId,
    aclConditions: {},
    aclContext: { jwt: { _id: 'user-1' } },
  }

  let mockRepoSurveyPublication: { find: jest.Mock }
  let mockSurveyHandler: { fetchForExport: jest.Mock }
  let mockPubHandler: { fetchForExport: jest.Mock }
  let collector: VssaExportCollector

  beforeEach(() => {
    jest.clearAllMocks()

    mockRepoSurveyPublication = {
      find: jest.fn().mockResolvedValue([{ _id: 'pub-1' }, { _id: 'pub-2' }]),
    }
    mockSurveyHandler = {
      fetchForExport: jest.fn().mockResolvedValue({
        survey: makeSurvey(),
        surveyLanguages: [],
        embeddedFileEntries: [],
      }),
    }
    mockPubHandler = { fetchForExport: jest.fn() }

    collector = new VssaExportCollector(
      mockRepoSurveyPublication as unknown as RepoSurveyPublication,
      mockSurveyHandler as unknown as SurveyEntityHandler,
      mockPubHandler as unknown as SurveyPublicationEntityHandler,
      { publicBucket: 'public', privateBucket: 'private' } as never,
    )
  })

  test('throws when publications individually pass the file-count cap but combine to exceed it', async () => {
    // Each publication's 3 response files would pass a per-publication check
    // (cap is 5), but two publications combine to 6, over the aggregate cap.
    mockPubHandler.fetchForExport
      .mockResolvedValueOnce({
        publication: { _id: 'pub-1', snapshotId: 'snap-1' },
        snapshot: { _id: 'snap-1' },
        snapshotData: {},
        surveyLanguageSnapshots: [],
        responseEntries: [],
        publicationId: 'pub-1',
        embeddedFileEntries: [],
        responseFileEntries: makeResponseFileEntries(3, 10),
      })
      .mockResolvedValueOnce({
        publication: { _id: 'pub-2', snapshotId: 'snap-2' },
        snapshot: { _id: 'snap-2' },
        snapshotData: {},
        surveyLanguageSnapshots: [],
        responseEntries: [],
        publicationId: 'pub-2',
        embeddedFileEntries: [],
        responseFileEntries: makeResponseFileEntries(3, 10),
      })

    await expect(collector.collect(surveyId, baseContext)).rejects.toThrow(
      /exceeding the 5 limit/,
    )
  })

  test('throws when publications individually pass the size cap but combine to exceed it', async () => {
    mockPubHandler.fetchForExport
      .mockResolvedValueOnce({
        publication: { _id: 'pub-1', snapshotId: 'snap-1' },
        snapshot: { _id: 'snap-1' },
        snapshotData: {},
        surveyLanguageSnapshots: [],
        responseEntries: [],
        publicationId: 'pub-1',
        embeddedFileEntries: [],
        responseFileEntries: makeResponseFileEntries(1, 600),
      })
      .mockResolvedValueOnce({
        publication: { _id: 'pub-2', snapshotId: 'snap-2' },
        snapshot: { _id: 'snap-2' },
        snapshotData: {},
        surveyLanguageSnapshots: [],
        responseEntries: [],
        publicationId: 'pub-2',
        embeddedFileEntries: [],
        responseFileEntries: makeResponseFileEntries(1, 600),
      })

    await expect(collector.collect(surveyId, baseContext)).rejects.toThrow(
      /byte total size limit/,
    )
  })

  test('succeeds and bundles a response manifest when the combined total is within limits', async () => {
    mockPubHandler.fetchForExport
      .mockResolvedValueOnce({
        publication: { _id: 'pub-1', snapshotId: 'snap-1' },
        snapshot: { _id: 'snap-1' },
        snapshotData: {},
        surveyLanguageSnapshots: [],
        responseEntries: [],
        publicationId: 'pub-1',
        embeddedFileEntries: [],
        responseFileEntries: makeResponseFileEntries(1, 100),
      })
      .mockResolvedValueOnce({
        publication: { _id: 'pub-2', snapshotId: 'snap-2' },
        snapshot: { _id: 'snap-2' },
        snapshotData: {},
        surveyLanguageSnapshots: [],
        responseEntries: [],
        publicationId: 'pub-2',
        embeddedFileEntries: [],
        responseFileEntries: makeResponseFileEntries(1, 100),
      })

    const result = await collector.collect(surveyId, baseContext)

    const filenames = result.entries.map((e) => e.filename)
    expect(filenames).toContain('files/response-manifest-000.json')
  })

  test('reads a private-bucket response file from the private bucket, and a public one from the public bucket', async () => {
    const mockAdaptor = {
      getObject: jest.fn().mockResolvedValue({ Body: 'stream' }),
    }
    ;(createStorageAdaptor as jest.Mock).mockReturnValue(mockAdaptor)
    mockRepoSurveyPublication.find.mockResolvedValue([{ _id: 'pub-1' }])

    mockPubHandler.fetchForExport.mockResolvedValueOnce({
      publication: { _id: 'pub-1', snapshotId: 'snap-1' },
      snapshot: { _id: 'snap-1' },
      snapshotData: {},
      surveyLanguageSnapshots: [],
      responseEntries: [],
      publicationId: 'pub-1',
      embeddedFileEntries: [],
      responseFileEntries: [
        {
          fileId: 'file-private',
          filename: 'file-private.pdf',
          s3Key: 'files/response/file-private.pdf',
          mimeType: 'application/pdf',
          hash: null,
          size: 10,
          bucket: '000',
          archiveEntryPath: 'files/response/000/file-private.pdf',
          bucketType: 'private',
        },
        {
          fileId: 'file-public',
          filename: 'file-public.pdf',
          s3Key: 'files/response/file-public.pdf',
          mimeType: 'application/pdf',
          hash: null,
          size: 10,
          bucket: '000',
          archiveEntryPath: 'files/response/000/file-public.pdf',
          bucketType: 'public',
        },
      ],
    })

    const result = await collector.collect(surveyId, baseContext)

    const privateEntry = result.entries.find(
      (e) => e.filename === 'files/response/000/file-private.pdf',
    ) as { stream: () => Promise<unknown> } | undefined
    const publicEntry = result.entries.find(
      (e) => e.filename === 'files/response/000/file-public.pdf',
    ) as { stream: () => Promise<unknown> } | undefined
    expect(privateEntry?.stream).toBeDefined()
    await privateEntry?.stream()
    expect(mockAdaptor.getObject).toHaveBeenCalledWith(
      expect.objectContaining({ Bucket: 'private' }),
    )

    mockAdaptor.getObject.mockClear()
    await publicEntry?.stream()
    expect(mockAdaptor.getObject).toHaveBeenCalledWith(
      expect.objectContaining({ Bucket: 'public' }),
    )
  })
})
