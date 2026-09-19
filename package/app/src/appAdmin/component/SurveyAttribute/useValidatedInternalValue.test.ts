import { act, renderHook } from '@testing-library/react'

import { useValidatedInternalValue } from './useValidatedInternalValue'

describe('useValidatedInternalValue', () => {
  it('initialises from computeValue', () => {
    const { result } = renderHook(() =>
      useValidatedInternalValue('a', true, () => 'a'),
    )
    expect(result.current[0]).toBe('a')
  })

  it('re-syncs when value changes while valid', () => {
    const { result, rerender } = renderHook(
      ({ value, isValid }) =>
        useValidatedInternalValue(value, isValid, () => value),
      { initialProps: { value: 'a', isValid: true } },
    )
    expect(result.current[0]).toBe('a')

    rerender({ value: 'b', isValid: true })
    expect(result.current[0]).toBe('b')
  })

  it('preserves internal value when value changes while invalid', () => {
    const { result, rerender } = renderHook(
      ({ value, isValid }) =>
        useValidatedInternalValue(value, isValid, () => value),
      { initialProps: { value: 'a', isValid: true } },
    )
    expect(result.current[0]).toBe('a')

    // User typed an invalid value locally via setValueInternal
    act(() => result.current[1]('invalid-user-input'))
    rerender({ value: 'a', isValid: false })
    expect(result.current[0]).toBe('invalid-user-input')

    // Prop still hasn't changed, still invalid — must not clobber user input
    rerender({ value: 'a', isValid: false })
    expect(result.current[0]).toBe('invalid-user-input')
  })

  it('re-syncs once validation passes again', () => {
    const { result, rerender } = renderHook(
      ({ value, isValid }) =>
        useValidatedInternalValue(value, isValid, () => value),
      { initialProps: { value: 'a', isValid: true } },
    )

    act(() => result.current[1]('invalid-user-input'))
    rerender({ value: 'a', isValid: false })
    expect(result.current[0]).toBe('invalid-user-input')

    rerender({ value: 'c', isValid: true })
    expect(result.current[0]).toBe('c')
  })
})
