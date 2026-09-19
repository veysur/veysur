import { useState } from 'react'

/**
 * Hook for managing defaultable state logic
 * Handles the state management for components that can use default values
 *
 * @param currentValue - The current value (null/undefined means use default)
 * @param defaultValue - The default value to use when using defaults
 * @param onChange - Callback when value changes (null = use default, otherwise actual value)
 * @returns State and handlers for managing defaultable inputs
 */
export function useDefaultableState<T>(
  currentValue: T | null | undefined,
  defaultValue: T,
  onChange: (value: T | null) => void,
) {
  // Optimistic local state for immediate UI feedback
  const [optimisticIsUsingDefault, setOptimisticIsUsingDefault] = useState<
    boolean | null
  >(null)
  const [inputValue, setInputValue] = useState<T>(currentValue ?? defaultValue)

  // Reset the optimistic override and re-sync inputValue whenever the
  // server-derived currentValue changes, adjusted during render (see React's
  // "Adjusting state when a prop changes") rather than via an effect - this
  // also collapses what were two cascading render passes into one.
  const [prevCurrentValue, setPrevCurrentValue] = useState(currentValue)
  if (currentValue !== prevCurrentValue) {
    setPrevCurrentValue(currentValue)
    setOptimisticIsUsingDefault(null)
    if (currentValue !== null && currentValue !== undefined) {
      setInputValue(currentValue)
    }
  }

  // Use optimistic state if available, otherwise derive from currentValue
  const isUsingDefault =
    optimisticIsUsingDefault !== null
      ? optimisticIsUsingDefault
      : currentValue === null || currentValue === undefined

  const displayValue = isUsingDefault
    ? defaultValue
    : (currentValue ?? defaultValue)

  const handleUseDefaultChange = (useDefault: boolean) => {
    // Immediately update local state for instant UI feedback
    setOptimisticIsUsingDefault(useDefault)

    if (useDefault) {
      onChange(null)
      setInputValue(defaultValue)
    } else {
      // Toggling off default: prefer the real persisted value over a
      // possibly-stale local inputValue left over from "use default" mode.
      const value =
        currentValue !== null && currentValue !== undefined
          ? currentValue
          : (inputValue ?? defaultValue)
      setInputValue(value)
      onChange(value)
    }
  }

  const handleValueChange = (value: T) => {
    setInputValue(value)
    onChange(value)
  }

  return {
    isUsingDefault,
    displayValue,
    inputValue,
    handleUseDefaultChange,
    handleValueChange,
  }
}
