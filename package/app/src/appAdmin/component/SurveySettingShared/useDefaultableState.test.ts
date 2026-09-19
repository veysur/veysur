import { renderHook, act } from '@testing-library/react'
import { useDefaultableState } from './useDefaultableState'

describe('useDefaultableState', () => {
  it('starts using default when currentValue is null/undefined', () => {
    const onChange = jest.fn()
    const { result } = renderHook(() =>
      useDefaultableState<string>(null, 'default-value', onChange),
    )

    expect(result.current.isUsingDefault).toBe(true)
    expect(result.current.displayValue).toBe('default-value')
  })

  it('resets the optimistic override when currentValue changes from the server', () => {
    const onChange = jest.fn()
    const { result, rerender } = renderHook(
      ({ currentValue }) =>
        useDefaultableState<string>(currentValue, 'default-value', onChange),
      { initialProps: { currentValue: null as string | null } },
    )

    // User optimistically switches off default
    act(() => {
      result.current.handleUseDefaultChange(false)
    })
    expect(result.current.isUsingDefault).toBe(false)

    // Server pushes a fresh value (e.g. after a refetch) - the optimistic
    // override must not stick around and mask this real change
    rerender({ currentValue: 'server-value' })
    expect(result.current.isUsingDefault).toBe(false)
    expect(result.current.displayValue).toBe('server-value')
    expect(result.current.inputValue).toBe('server-value')
  })

  it('re-derives isUsingDefault from a null currentValue once the optimistic override is cleared by a change', () => {
    const onChange = jest.fn()
    const { result, rerender } = renderHook(
      ({ currentValue }) =>
        useDefaultableState<string>(currentValue, 'default-value', onChange),
      { initialProps: { currentValue: 'initial' as string | null } },
    )

    act(() => {
      result.current.handleUseDefaultChange(true)
    })
    expect(result.current.isUsingDefault).toBe(true)

    // Any currentValue change (even to a different non-null value) clears
    // the optimistic override and re-derives from the new prop
    rerender({ currentValue: 'changed' })
    expect(result.current.isUsingDefault).toBe(false)
    expect(result.current.displayValue).toBe('changed')
  })

  it('surfaces the persisted currentValue (not a stale local inputValue) when toggling off default', () => {
    const onChange = jest.fn()
    const { result } = renderHook(() =>
      useDefaultableState<string>('persisted-value', 'default-value', onChange),
    )

    act(() => {
      result.current.handleUseDefaultChange(true)
    })
    expect(result.current.displayValue).toBe('default-value')

    act(() => {
      result.current.handleUseDefaultChange(false)
    })

    expect(result.current.isUsingDefault).toBe(false)
    expect(result.current.inputValue).toBe('persisted-value')
    expect(onChange).toHaveBeenLastCalledWith('persisted-value')
  })

  it('falls back to the local inputValue when toggling off default with no persisted currentValue', () => {
    const onChange = jest.fn()
    const { result } = renderHook(() =>
      useDefaultableState<string>(null, 'default-value', onChange),
    )

    act(() => {
      result.current.handleValueChange('user-typed')
    })
    act(() => {
      result.current.handleUseDefaultChange(true)
    })
    act(() => {
      result.current.handleUseDefaultChange(false)
    })

    expect(result.current.isUsingDefault).toBe(false)
    expect(result.current.inputValue).toBe('default-value')
  })
})
