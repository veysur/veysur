import { S3Adaptor } from 's3-adaptor'

/**
 * In-memory store populated by TarGzFormatHandler.parse() as archive entries stream through.
 *
 * JSON entries are buffered in memory (typically < 1 MB each).
 * Binary entries are streamed directly to temp S3 keys during parsing — zero memory overhead.
 *
 * Returned to entity parsers and persisters in place of the old path-based EntityParsedData.
 */
export class ArchiveReader {
  private jsonEntries = new Map<string, unknown>()
  private binaryS3Keys = new Map<string, string>() // archivePath → temp S3 key

  constructor(
    private readonly adaptor: S3Adaptor,
    private readonly bucket: string,
  ) {}

  setJson(name: string, data: unknown): void {
    this.jsonEntries.set(name, data)
  }

  setBinaryS3Key(name: string, s3Key: string): void {
    this.binaryS3Keys.set(name, s3Key)
  }

  // The archive is an untyped wire boundary. The optional type argument names
  // the shape the caller expects; it is not validated here, so callers that
  // consume the result structurally must still guard (or route through
  // `SurveyImportValidator`).
  getJson<T = unknown>(name: string): T | null {
    return this.jsonEntries.has(name)
      ? ((this.jsonEntries.get(name) ?? null) as T | null)
      : null
  }

  deleteJson(name: string): void {
    this.jsonEntries.delete(name)
  }

  getBinaryS3Key(name: string): string | null {
    return this.binaryS3Keys.get(name) ?? null
  }

  listEntries(): string[] {
    return [...this.jsonEntries.keys(), ...this.binaryS3Keys.keys()]
  }

  async cleanup(): Promise<void> {
    for (const s3Key of this.binaryS3Keys.values()) {
      await this.adaptor
        .deleteObject({ Bucket: this.bucket, Key: s3Key })
        .catch(() => {})
    }
    this.jsonEntries.clear()
    this.binaryS3Keys.clear()
  }
}
