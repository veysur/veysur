import { useState } from 'react'

// Re-syncs internal state from `value` whenever it changes while `isValid` is
// true, using React's render-time state-adjustment pattern instead of an
// effect. Keeps the user's invalid input visible until validation passes
// again — an effect-based reset would flash the old valid value for a frame.
export function useValidatedInternalValue<T>(
  value: T,
  isValid: boolean,
  computeValue: () => T,
) {
  const [valueInternal, setValueInternal] = useState(computeValue)
  const [prevValue, setPrevValue] = useState(value)
  const [prevIsValid, setPrevIsValid] = useState(isValid)

  if (isValid && (value !== prevValue || isValid !== prevIsValid)) {
    setPrevValue(value)
    setPrevIsValid(isValid)
    setValueInternal(computeValue())
  }

  return [valueInternal, setValueInternal] as const
}
