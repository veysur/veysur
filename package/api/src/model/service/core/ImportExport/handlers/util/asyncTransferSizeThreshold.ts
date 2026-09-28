export const ASYNC_TRANSFER_SIZE_THRESHOLD_BYTES = 1 * 1024 * 1024 // 1MB

// Heuristic used where an exact size would cost as much to compute as doing
// the export itself (see estimateExportSize on response-bearing handlers).
// Deliberately conservative (rounds up) so we err toward queueing rather
// than blocking the request on an underestimate.
export const ESTIMATED_BYTES_PER_RESPONSE = 2048
