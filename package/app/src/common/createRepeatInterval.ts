/**
 * Repeatedly executes a callback function every specified milliseconds.
 * @param callback The function to execute repeatedly.
 * @param intervalMs The interval in milliseconds between executions.
 * @param immediate If true, executes the callback immediately before starting the interval.
 * @returns An object with a `stop` method to cancel the execution.
 */
export function createRepeatInterval(
  callback: () => void,
  intervalMs: number,
  immediate: boolean = false,
): { stop: () => void } {
  let timerId: NodeJS.Timeout | null = null
  let isRunning = true

  const execute = () => {
    if (!isRunning) return
    callback()
    timerId = setTimeout(execute, intervalMs)
  }

  if (immediate) {
    execute()
  } else {
    timerId = setTimeout(execute, intervalMs)
  }

  return {
    stop: () => {
      if (timerId) {
        clearTimeout(timerId)
        timerId = null
      }
      isRunning = false
    },
  }
}
