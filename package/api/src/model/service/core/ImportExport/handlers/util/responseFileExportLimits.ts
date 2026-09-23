/**
 * Guardrail on the volume of response-uploaded files a single synchronous
 * `.vssp`/`.vssa` export can bundle. Export currently compiles and streams
 * the archive within the request; a survey with many large fileUpload
 * answers could otherwise exhaust request time/memory before this can be
 * moved to an async job.
 */
export const MAX_RESPONSE_EXPORT_FILE_COUNT = 5000
export const MAX_RESPONSE_EXPORT_TOTAL_SIZE = 2 * 1024 * 1024 * 1024 // 2GB
