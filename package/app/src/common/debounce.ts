export function debounce<T extends (...args: never[]) => unknown>(
  func: T,
  delay: number,
) {
  let timeout: NodeJS.Timeout | null = null // Stores the timer ID

  return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout) // Clear any existing timer

    timeout = setTimeout(() => {
      // Set a new timer
      func.apply(this, args) // Execute the original function
    }, delay)
  }
}

/**
 * Debounces an async function and returns a promise that resolves with the result.
 * Only the last call within the debounce delay will execute the actual function.
 *
 * @param func - The async function to debounce
 * @param delay - The debounce delay in milliseconds
 * @param cancelValue - Optional value to resolve cancelled promises with
 */
export function debounceAsync<T extends (...args: never[]) => Promise<unknown>>(
  func: T,
  delay: number,
  cancelValue?: Awaited<ReturnType<T>>,
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  let timeout: NodeJS.Timeout | null = null
  let pendingResolvers: Array<{
    resolve: (value: Awaited<ReturnType<T>>) => void
    reject: (reason?: unknown) => void
  }> = []

  return function (
    this: ThisParameterType<T>,
    ...args: Parameters<T>
  ): Promise<Awaited<ReturnType<T>>> {
    // Clear existing timeout to cancel previous debounced call
    if (timeout) {
      clearTimeout(timeout)

      // Resolve all pending promises with cancel value if provided
      if (cancelValue !== undefined) {
        pendingResolvers.forEach(({ resolve }) => resolve(cancelValue))
        pendingResolvers = []
      }
    }

    return new Promise((resolve, reject) => {
      // Add to pending resolvers
      pendingResolvers.push({ resolve, reject })

      timeout = setTimeout(async () => {
        const resolvers = [...pendingResolvers]
        pendingResolvers = []

        try {
          const result = await func.apply(this, args)
          // Resolve all pending promises with the result
          resolvers.forEach(({ resolve }) =>
            resolve(result as Awaited<ReturnType<T>>),
          )
        } catch (error) {
          // Reject all pending promises with the error
          resolvers.forEach(({ reject }) => reject(error))
        } finally {
          timeout = null
        }
      }, delay)
    })
  }
}
