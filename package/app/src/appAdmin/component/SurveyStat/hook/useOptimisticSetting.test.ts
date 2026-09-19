import { act, renderHook } from '@testing-library/react'

import { useOptimisticSetting } from './useOptimisticSetting'

describe('useOptimisticSetting', () => {
  it('starts with no pending override', () => {
    const { result } = renderHook(() => useOptimisticSetting<string>(undefined))
    expect(result.current[0]).toBeNull()
  })

  it('stores the pending value and calls onCommit', () => {
    const onCommit = jest.fn()
    const { result } = renderHook(() =>
      useOptimisticSetting<string>(undefined, onCommit),
    )

    act(() => result.current[1]('pie'))

    expect(result.current[0]).toBe('pie')
    expect(onCommit).toHaveBeenCalledWith('pie')
  })

  it('clears the override once the saved value catches up', () => {
    const { result, rerender } = renderHook(
      ({ saved }) => useOptimisticSetting<string>(saved),
      { initialProps: { saved: 'bar' as string } },
    )

    act(() => result.current[1]('pie'))
    expect(result.current[0]).toBe('pie')

    rerender({ saved: 'pie' })
    expect(result.current[0]).toBeNull()
  })

  it('keeps the override while the saved value still differs', () => {
    const { result, rerender } = renderHook(
      ({ saved }) => useOptimisticSetting<string>(saved),
      { initialProps: { saved: 'bar' as string } },
    )

    act(() => result.current[1]('pie'))
    rerender({ saved: 'horizontalBar' })

    expect(result.current[0]).toBe('pie')
  })
})
