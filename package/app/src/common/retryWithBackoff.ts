import { sleep } from './sleep'

export type RetryConfig = {
  maxAttempts: number
  delaysMs: number[]
  shouldRetry?: (error: unknown) => boolean
  onRetry?: (attempt: number, error: unknown) => void
}

export type RetryResult<T> = {
  success: boolean
  result?: T
  error?: unknown
  attempts: number
}

/**
 * Executes a function with retry logic and exponential backoff.
 *
 * @param fn - The async function to execute
 * @param config - Retry configuration
 * @returns RetryResult with success status, result/error, and attempt count
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig,
): Promise<RetryResult<T>> {
  const { maxAttempts, delaysMs, shouldRetry, onRetry } = config
  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn()
      return { success: true, result, attempts: attempt }
    } catch (error) {
      lastError = error

      // Check if we should retry this error
      if (shouldRetry && !shouldRetry(error)) {
        return { success: false, error, attempts: attempt }
      }

      // Don't wait after last attempt
      if (attempt < maxAttempts) {
        const delayIndex = attempt - 1
        const delay = delaysMs[delayIndex] || delaysMs[delaysMs.length - 1]

        onRetry?.(attempt, error)
        await sleep(delay)
      }
    }
  }

  return { success: false, error: lastError, attempts: maxAttempts }
}
