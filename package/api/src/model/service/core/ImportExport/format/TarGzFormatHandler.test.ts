import { PassThrough, Readable, Writable } from 'stream'

import { VsstFormatHandler } from './VsstFormatHandler'

jest.mock('./importArchiveLimits', () => ({
  MAX_IMPORT_ARCHIVE_ENTRY_COUNT: 3,
  MAX_IMPORT_ARCHIVE_TOTAL_SIZE: 1000,
  MAX_IMPORT_JSON_ENTRY_SIZE: 200,
}))

jest.mock('zlib', () => ({
  ...jest.requireActual('zlib'),
  createGunzip: () => new PassThrough(),
}))

// TarGzFormatHandler.parse() drives its guardrail logic entirely off the
// `extract`'s 'entry'/'finish'/'error' events, independent of real tar/gzip
// decoding, so the fake below (a plain Writable that the test emits
// 'entry' on directly) exercises the same code path without needing an
// actual tar+gz byte stream.
let extractInstance: Writable

jest.mock('tar-stream', () => ({
  extract: jest.fn(() => {
    extractInstance = new Writable({
      write(_chunk, _enc, cb) {
        cb()
      },
    })
    return extractInstance
  }),
}))

const uploadObject = jest.fn().mockResolvedValue(undefined)
const deleteObject = jest.fn().mockResolvedValue(undefined)

jest.mock('common', () => ({
  ...jest.requireActual('common'),
  createStorageAdaptor: jest.fn().mockReturnValue({
    uploadObject: (...args: unknown[]) => uploadObject(...args),
    deleteObject: (...args: unknown[]) => deleteObject(...args),
  }),
}))

function emitEntry(name: string, content: Buffer): void {
  const entryStream = Readable.from([content])
  extractInstance.emit('entry', { name, size: content.length }, entryStream, () => {})
}

describe('TarGzFormatHandler.parse', () => {
  const storageConfig = {
    privateBucket: 'private-bucket',
    publicBucket: 'public-bucket',
  } as never

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('parses an archive within the limits', async () => {
    const handler = new VsstFormatHandler(storageConfig)
    const input = new PassThrough()

    const parsePromise = handler.parse(input)
    emitEntry('survey.json', Buffer.from(JSON.stringify({ a: 1 })))
    emitEntry('files/one.bin', Buffer.from('binary-data'))
    await Promise.resolve() // let the binary entry's uploadObject().then() settle
    input.end() // propagates through the mocked gunzip PassThrough, ending extractInstance and firing its real 'finish'

    const reader = await parsePromise

    expect(reader.getJson('survey.json')).toEqual({ a: 1 })
    expect(reader.getBinaryS3Key('files/one.bin')).toMatch(/^import-temp\//)
  })

  it('records a malformed JSON entry instead of failing the parse', async () => {
    const handler = new VsstFormatHandler(storageConfig)
    const input = new PassThrough()

    const parsePromise = handler.parse(input)
    emitEntry('good.json', Buffer.from(JSON.stringify({ a: 1 })))
    emitEntry('bad.json', Buffer.from('{not json'))
    await Promise.resolve()
    input.end()

    const reader = await parsePromise

    expect(reader.getJson('good.json')).toEqual({ a: 1 })
    expect(reader.getJson('bad.json')).toBeNull()
    expect(reader.getMalformedJsonEntries()).toEqual(['bad.json'])
  })

  it('rejects an archive with more entries than the entry-count limit', async () => {
    const handler = new VsstFormatHandler(storageConfig)
    const input = new PassThrough()

    const parsePromise = handler.parse(input)
    emitEntry('a.json', Buffer.from('{}'))
    emitEntry('b.json', Buffer.from('{}'))
    emitEntry('c.json', Buffer.from('{}'))
    emitEntry('d.json', Buffer.from('{}'))

    await expect(parsePromise).rejects.toThrow(/exceeds the maximum allowed size/)
  })

  it('rejects an archive whose total size exceeds the total-size limit', async () => {
    const handler = new VsstFormatHandler(storageConfig)
    const input = new PassThrough()

    const parsePromise = handler.parse(input)
    emitEntry('big.bin', Buffer.alloc(1001, 'x'))

    await expect(parsePromise).rejects.toThrow(/exceeds the maximum allowed size/)
  })

  it('rejects a single JSON entry larger than the per-entry JSON size limit', async () => {
    const handler = new VsstFormatHandler(storageConfig)
    const input = new PassThrough()

    const parsePromise = handler.parse(input)
    emitEntry('survey.json', Buffer.from(JSON.stringify({ a: 'x'.repeat(300) })))

    await expect(parsePromise).rejects.toThrow(
      /Import entry "survey.json" exceeds the maximum allowed size/,
    )
  })

  it('cleans up already-uploaded binary entries when a later entry breaches a limit', async () => {
    const handler = new VsstFormatHandler(storageConfig)
    const input = new PassThrough()

    const parsePromise = handler.parse(input)
    emitEntry('files/one.bin', Buffer.from('binary-data'))
    await Promise.resolve()
    emitEntry('files/two.bin', Buffer.from('binary-data'))
    await Promise.resolve()
    emitEntry('files/three.bin', Buffer.from('binary-data'))
    await Promise.resolve()
    emitEntry('files/four.bin', Buffer.from('binary-data'))

    await expect(parsePromise).rejects.toThrow()
    expect(deleteObject).toHaveBeenCalled()
  })
})
