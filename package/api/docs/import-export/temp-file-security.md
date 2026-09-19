# Temp File Security

## Status: Fully resolved — no disk writes

Neither import nor export writes any temporary files to the pod's local filesystem.

## How it works

**Import** — fully streaming, zero disk writes:

- S3 download streams directly through `zlib.createGunzip()` → `tar-stream` extract
- JSON entries are buffered in memory (typically &lt; 1 MB each)
- Binary entries (images) are piped directly to a temp S3 key (`import-temp/{importFileId}/{name}`)
- File hash and byte count are computed inline via a `PassThrough` tap
- Temp S3 keys are cleaned up by `ArchiveReader.cleanup()` in the `finally` block of `processImport()`

**Export** — fully streaming, zero disk writes:

- `TarGzFormatHandler.serialize()` returns a `Readable` (tar+gz stream); no file is written to disk
- `JsonFormatHandler` and `CsvFormatHandler` return in-memory `Readable.from([buf])` streams
- `ServiceFileTempDownload.createTempDownloadFromStream()` pipes the stream directly to S3
  while computing hash and size inline via a `PassThrough` tap

See: `ServiceImportExport.ts`, `ServiceFileTempDownload.ts`, `format/TarGzFormatHandler.ts`,
`format/ArchiveReader.ts`

## Previous approaches considered

An encrypted host-level LUKS disk exposed into the API pod (`api.tmpStorage.hostPath` in
the Helm chart) was evaluated and partially built, but never wired up in any environment.
The streaming rewrite above eliminated the need for it entirely, so that config was
removed from the chart rather than finished — no further temp-storage encryption work is
needed for import/export.

For how encryption at rest works everywhere else in the infrastructure (database volumes,
Garage buckets, backups), see [`luks-encryption.md`](../../../infra/docs/luks-encryption.md).
