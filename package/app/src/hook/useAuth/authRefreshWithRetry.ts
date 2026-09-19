import { toast } from 'sonner'
import { retryWithBackoff } from 'common'

import { classifyAuthRefreshError } from './authRefreshErrorClassifier'

export type AuthRefreshWithRetryOptions<T> = {
  authRefresh: () => Promise<T>
  logout: () => void
  onRetry?: (attempt: number, category: string) => void
}

// Module-level state for singleton pattern and fail-fast behavior
let activeRefreshPromise: Promise<unknown> | null = null
let isLoggingOut = false

/**
 * Reset the logging out state. Call this after successful login.
 */
export function resetAuthRefreshState() {
  isLoggingOut = false
  activeRefreshPromise = null
}

/**
 * Check if the auth system is currently logging out.
 */
export function getIsLoggingOut() {
  return isLoggingOut
}

/**
 * Wraps authRefresh() with retry logic and error handling.
 *
 * Features:
 * - Singleton pattern: concurrent calls reuse the same in-flight request
 * - Fail-fast: once logout is triggered, all subsequent calls return immediately
 * - Network/server errors: Retry 3x with exponential backoff (500ms, 1s, 2s)
 * - 401 Invalid token: No retry, logout immediately
 * - Shows appropriate toast messages on final failure
 *
 * @param options - Configuration including authRefresh function and logout
 * @returns The result from authRefresh() or undefined on failure
 */
export async function authRefreshWithRetry<T>(
  options: AuthRefreshWithRetryOptions<T>,
): Promise<T | undefined> {
  const { authRefresh, logout, onRetry } = options

  // Fail fast if already logging out
  if (isLoggingOut) {
    return undefined
  }

  // Reuse in-flight refresh request to prevent concurrent attempts
  if (activeRefreshPromise) {
    return activeRefreshPromise as Promise<T | undefined>
  }

  // Create the refresh promise
  const refreshPromise = doRefreshWithRetry(authRefresh, logout, onRetry)
  activeRefreshPromise = refreshPromise

  try {
    return await refreshPromise
  } finally {
    activeRefreshPromise = null
  }
}

/**
 * Internal function that performs the actual refresh with retry logic.
 */
async function doRefreshWithRetry<T>(
  authRefresh: () => Promise<T>,
  logout: () => void,
  onRetry?: (attempt: number, category: string) => void,
): Promise<T | undefined> {
  const result = await retryWithBackoff(authRefresh, {
    maxAttempts: 3,
    delaysMs: [500, 1000, 2000],
    shouldRetry: (error) => {
      // Don't retry if we're already logging out
      if (isLoggingOut) {
        return false
      }
      const { shouldRetry } = classifyAuthRefreshError(error)
      return shouldRetry
    },
    onRetry: (attempt, error) => {
      const { category } = classifyAuthRefreshError(error)
      onRetry?.(attempt, category)
      console.warn(
        `Auth refresh attempt ${attempt} failed (${category}), retrying...`,
      )
    },
  })

  if (result.success) {
    return result.result
  }

  // Handle final failure
  const { category } = classifyAuthRefreshError(result.error)

  switch (category) {
    case 'invalid_token':
      // Set fail-fast flag to prevent other pending refreshes from continuing
      isLoggingOut = true
      toast.error('Your session has expired. Please log in again.')
      logout()
      break

    case 'network':
      toast.error(
        'Network connection failed. Please check your internet connection and try again.',
      )
      break

    case 'server':
      toast.error('Unable to refresh session. Please try logging in again.')
      break
  }

  return undefined
}
