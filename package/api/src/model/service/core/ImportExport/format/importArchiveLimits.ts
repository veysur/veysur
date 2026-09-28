/**
 * Guardrail on the size of a `.vsst`/`.vssp`/`.vssa` archive that
 * TarGzFormatHandler.parse() will process. Import runs synchronously within
 * the request; an archive with unbounded entries or an oversized JSON
 * payload could otherwise exhaust request time/memory before this moves to
 * an async job (see docs/plan/formulate-a-phased-plan-typed-rain.md).
 */
export const MAX_IMPORT_ARCHIVE_ENTRY_COUNT = 5000
export const MAX_IMPORT_ARCHIVE_TOTAL_SIZE = 2 * 1024 * 1024 * 1024 // 2GB uncompressed
export const MAX_IMPORT_JSON_ENTRY_SIZE = 50 * 1024 * 1024 // 50MB per JSON entry (buffered in memory)
