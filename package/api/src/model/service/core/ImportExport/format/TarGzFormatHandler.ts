import fs from 'fs'
import { PassThrough, Readable } from 'stream'
import { pipeline } from 'stream/promises'
import zlib from 'zlib'
import tarStream from 'tar-stream'
import { ServerErrorBadRequest } from '@datacapy/server'
import { randomBytes } from 'crypto'

import { createStorageAdaptor } from 'common'
import { StorageConfig } from 'model/service/core/ServiceFile/FileS3Config'

import { FormatFileEntry } from '../EntityHandlerInterface'
import { ArchiveReader } from './ArchiveReader'
import {
  MAX_IMPORT_ARCHIVE_ENTRY_COUNT,
  MAX_IMPORT_ARCHIVE_TOTAL_SIZE,
  MAX_IMPORT_JSON_ENTRY_SIZE,
} from './importArchiveLimits'

/**
 * Abstract base class providing tar+gz archive serialization and parsing.
 *
 * Replaces ZipFormatHandler. Concrete subclasses (Vsst/Vssp/Vssa) set their own
 * format identifier, extensions, and filename generation.
 *
 * Export: entries are packed sequentially into a tar+gz stream returned directly to
 *         the caller — no disk writes.
 * Import: the input Readable streams directly through the tar parser — no disk writes.
 *         JSON entries are buffered in memory; binary entries are piped to temp S3 keys.
 */
export abstract class TarGzFormatHandler {
  abstract format: string
  abstract extensions: string[]
  private storageConfig?: StorageConfig

  constructor(storageConfig?: StorageConfig) {
    this.storageConfig = storageConfig
  }

  /**
   * Serialize file entries into a tar+gz stream — no disk writes.
   *
   * Entries are packed asynchronously as the stream is consumed downstream.
   * FormatFileEntryStream entries are piped directly using their known size
   * (no memory buffer needed).
   */
  serialize(data: unknown): Readable {
    const files = data as FormatFileEntry[]
    const pack = tarStream.pack()
    const gz = zlib.createGzip()
    pack.pipe(gz)
    ;(async () => {
      try {
        for (const file of files) {
          if ('content' in file) {
            const buf = Buffer.from(file.content, 'utf8')
            await packEntry(pack, file.filename, buf)
          } else if ('path' in file) {
            const buf = await fs.promises.readFile(file.path)
            await packEntry(pack, file.filename, buf)
          } else {
            const entryStream = await file.stream()
            await packEntryStream(pack, file.filename, file.size, entryStream)
          }
        }
        pack.finalize()
      } catch (err) {
        pack.destroy(err as Error)
      }
    })()

    return gz
  }

  /**
   * Parse a tar+gz Readable stream into an ArchiveReader — no disk writes.
   *
   * JSON entries are buffered in memory.
   * Binary entries are streamed directly to temp S3 keys at
   * `import-temp/{importFileId}/{entryName}`.
   */
  async parse(
    input: Readable,
    context?: { importFileId?: string },
  ): Promise<ArchiveReader> {
    if (!this.storageConfig) {
      throw new Error(
        'TarGzFormatHandler requires storageConfig to parse archives',
      )
    }

    const adaptor = createStorageAdaptor(this.storageConfig)
    const bucket = this.storageConfig.privateBucket
    const importFileId = context?.importFileId ?? randomBytes(8).toString('hex')
    const reader = new ArchiveReader(adaptor, bucket)

    const extract = tarStream.extract()

    let entryCount = 0
    let totalSize = 0
    let limitError: ServerErrorBadRequest | undefined

    const extractPromise = new Promise<void>((resolve, reject) => {
      extract.on('entry', (header, stream, next) => {
        entryCount += 1
        totalSize += header.size ?? 0

        if (
          entryCount > MAX_IMPORT_ARCHIVE_ENTRY_COUNT ||
          totalSize > MAX_IMPORT_ARCHIVE_TOTAL_SIZE
        ) {
          stream.resume()
          limitError = new ServerErrorBadRequest({
            message: `Import archive exceeds the maximum allowed size (max ${MAX_IMPORT_ARCHIVE_ENTRY_COUNT} entries, ${MAX_IMPORT_ARCHIVE_TOTAL_SIZE} bytes total)`,
          })
          extract.destroy(limitError)
          return next(limitError)
        }

        const name = header.name

        if (name.endsWith('.json')) {
          if ((header.size ?? 0) > MAX_IMPORT_JSON_ENTRY_SIZE) {
            stream.resume()
            limitError = new ServerErrorBadRequest({
              message: `Import entry "${name}" exceeds the maximum allowed size (${MAX_IMPORT_JSON_ENTRY_SIZE} bytes)`,
            })
            extract.destroy(limitError)
            return next(limitError)
          }

          const chunks: Buffer[] = []
          stream.on('data', (chunk: Buffer) => chunks.push(chunk))
          stream.on('end', () => {
            try {
              reader.setJson(
                name,
                JSON.parse(Buffer.concat(chunks).toString('utf8')),
              )
            } catch {
              // skip malformed JSON entries
            }
            next()
          })
          stream.on('error', () => next())
        } else {
          // Pipe through PassThrough to bridge Source to a standard
          // Node.js Readable that the AWS SDK accepts for putObject
          const tempKey = `import-temp/${importFileId}/${name}`
          const pass = new PassThrough()
          stream.pipe(pass)
          adaptor
            .uploadObject({
              Bucket: bucket,
              Key: tempKey,
              Body: pass,
              ContentType: 'application/octet-stream',
            })
            .then(() => {
              reader.setBinaryS3Key(name, tempKey)
              next()
            })
            .catch((err) => next(err))
        }
      })
      extract.on('finish', resolve)
      extract.on('error', reject)
    })

    try {
      await Promise.all([
        pipeline(input, zlib.createGunzip(), extract),
        extractPromise,
      ])
    } catch {
      await reader.cleanup()
      if (limitError) {
        throw limitError
      }
      throw new ServerErrorBadRequest({
        message: 'Invalid file: not a valid tar+gz archive',
      })
    }

    return reader
  }

  abstract getFilename(
    entityType: string,
    entityId: string,
    options?: Record<string, string | boolean | undefined>,
  ): string

  getMimeType(): string {
    return 'application/octet-stream'
  }
}

function packEntry(
  pack: tarStream.Pack,
  name: string,
  buf: Buffer,
): Promise<void> {
  return new Promise((resolve, reject) => {
    pack.entry({ name, size: buf.length }, buf, (err) =>
      err ? reject(err) : resolve(),
    )
  })
}

function packEntryStream(
  pack: tarStream.Pack,
  name: string,
  size: number,
  src: Readable,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const entry = pack.entry({ name, size }, (err) =>
      err ? reject(err) : resolve(),
    )
    pipeline(src, entry).catch(reject)
  })
}
