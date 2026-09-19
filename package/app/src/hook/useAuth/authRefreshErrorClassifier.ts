import { AxiosError } from 'axios'

import { ErrorRest } from 'model/api/ErrorRest'

export type ErrorCategory = 'network' | 'server' | 'invalid_token'

export type RetryDecision = {
  shouldRetry: boolean
  category: ErrorCategory
}

/**
 * Classifies authRefresh errors into categories and determines retry behavior.
 *
 * @param error - The error from authRefresh attempt
 * @returns RetryDecision with category and whether to retry
 */
export function classifyAuthRefreshError(error: unknown): RetryDecision {
  // Check if error is ErrorRest (wrapped AxiosError from our API)
  if (error instanceof ErrorRest) {
    // 401 = invalid token, no retry
    if (error.status === 401 || error.response?.status === 401) {
      return { shouldRetry: false, category: 'invalid_token' }
    }

    // Network errors (no response or timeout codes)
    if (
      !error.response ||
      error.code === 'ECONNABORTED' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ERR_NETWORK'
    ) {
      return { shouldRetry: true, category: 'network' }
    }

    // Server errors (500+) or other 4XX errors
    if (error.status && error.status >= 400) {
      return { shouldRetry: true, category: 'server' }
    }
  }

  // Check if error is raw AxiosError
  const isAxiosError = (err: unknown): err is AxiosError => {
    if (!err || typeof err !== 'object') return false
    // Axios errors have response, code, or isAxiosError flag
    // Exclude plain Error objects (they only have name, message, stack)
    return 'response' in err || 'code' in err || 'isAxiosError' in err
  }

  if (!isAxiosError(error)) {
    return { shouldRetry: false, category: 'server' }
  }

  // 401 = invalid token, no retry
  if (error.response?.status === 401) {
    return { shouldRetry: false, category: 'invalid_token' }
  }

  // Network errors (no response or timeout codes)
  if (
    !error.response ||
    error.code === 'ECONNABORTED' ||
    error.code === 'ETIMEDOUT' ||
    error.code === 'ERR_NETWORK'
  ) {
    return { shouldRetry: true, category: 'network' }
  }

  // Server errors (500+) or other 4XX errors
  if (error.response.status >= 400) {
    return { shouldRetry: true, category: 'server' }
  }

  return { shouldRetry: false, category: 'server' }
}
