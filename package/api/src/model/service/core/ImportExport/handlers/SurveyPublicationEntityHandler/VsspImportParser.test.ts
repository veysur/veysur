import type { S3Adaptor } from 's3-adaptor'

import { ArchiveReader } from '../../format/ArchiveReader'
import type { FormatHandlerInterface } from '../../format/FormatHandlerInterface'
import { VsspImportParser } from './VsspImportParser'
import type { ResponseFileManifestEntry } from './types'

function makeEntry(fileId: string, bucket: string): ResponseFileManifestEntry {
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

describe('VsspImportParser — response file manifest discovery', () => {
  let parser: VsspImportParser
  let reader: ArchiveReader

  beforeEach(() => {
    parser = new VsspImportParser()
    reader = new ArchiveReader({} as S3Adaptor, 'bucket')
    reader.setJson('surveyPublication.json', { _id: 'pub-1' })
    reader.setJson('surveySnapshotData.json', {})
  })

  function makeFormatHandler(): FormatHandlerInterface {
    return {
      format: 'vssp',
      extensions: ['.vssp'],
      serialize: jest.fn(),
      parse: jest.fn().mockResolvedValue(reader),
      getFilename: jest.fn(),
      getMimeType: jest.fn(),
    }
  }

  test('merges entries from multiple per-bucket manifests', async () => {
    reader.setJson('files/response-manifest-001.json', {
      version: '1.0',
      files: [makeEntry('file-a', '001'), makeEntry('file-b', '001')],
    })
    reader.setJson('files/response-manifest-042.json', {
      version: '1.0',
      files: [makeEntry('file-c', '042')],
    })

    const result = await parser.parse(
      undefined as never,
      makeFormatHandler(),
    )

    expect(result.responseFileEntries.map((e) => e.fileId).sort()).toEqual([
      'file-a',
      'file-b',
      'file-c',
    ])
  })

  test('falls back to a legacy single response-manifest.json for older archives', async () => {
    reader.setJson('files/response-manifest.json', {
      version: '1.0',
      files: [makeEntry('legacy-file', '000')],
    })
    // A legacy archive never has per-bucket manifest keys alongside it.

    const result = await parser.parse(
      undefined as never,
      makeFormatHandler(),
    )

    expect(result.responseFileEntries.map((e) => e.fileId)).toEqual([
      'legacy-file',
    ])
  })

  test('returns an empty array when no response files were exported', async () => {
    const result = await parser.parse(
      undefined as never,
      makeFormatHandler(),
    )

    expect(result.responseFileEntries).toEqual([])
  })
})
