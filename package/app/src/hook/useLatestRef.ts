import { useRef, useLayoutEffect } from 'react'

// Keeps a ref in sync with the latest value without mutating it during
// render, so closures (e.g. in useCallback) can read a fresh value without
// being recreated on every change.
export function useLatestRef<T>(value: T) {
  const ref = useRef(value)
  useLayoutEffect(() => {
    ref.current = value
  })
  return ref
}

export default useLatestRef
