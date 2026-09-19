import { useState } from 'react'

/**
 * Optimistic override for a value that is persisted asynchronously (a survey
 * PATCH, here). Returns the pending local choice (or `null` when none) and a
 * `commit` setter that stores it and notifies the caller.
 *
 * The override clears itself during render once `saved` catches up to it - the
 * condition is self-stabilising, so a render-time `setState` is safe.
 */
export function useOptimisticSetting<T>(
  saved: T | null | undefined,
  onCommit?: (value: T) => void,
): [T | null, (value: T) => void] {
  const [local, setLocal] = useState<T | null>(null)

  if (local !== null && saved === local) {
    setLocal(null)
  }

  const commit = (value: T) => {
    setLocal(value)
    onCommit?.(value)
  }

  return [local, commit]
}
