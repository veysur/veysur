import { debounce } from './debounce'

describe('debounce', () => {
  jest.useFakeTimers()

  test('debounced function is called after the specified delay', () => {
    const mockFn = jest.fn()
    const debouncedFn = debounce(mockFn, 1000)

    debouncedFn()
    expect(mockFn).not.toHaveBeenCalled()

    jest.advanceTimersByTime(999)
    expect(mockFn).not.toHaveBeenCalled()

    jest.advanceTimersByTime(1)
    expect(mockFn).toHaveBeenCalledTimes(1)
  })

  test('debounced function is called only once when invoked multiple times within delay', () => {
    const mockFn = jest.fn()
    const debouncedFn = debounce(mockFn, 1000)

    debouncedFn()
    debouncedFn()
    debouncedFn()

    jest.advanceTimersByTime(1000)
    expect(mockFn).toHaveBeenCalledTimes(1)
  })

  test('debounced function is called with the latest arguments', () => {
    const mockFn = jest.fn()
    const debouncedFn = debounce(mockFn, 1000)

    debouncedFn(1)
    debouncedFn(2)
    debouncedFn(3)

    jest.advanceTimersByTime(1000)
    expect(mockFn).toHaveBeenCalledWith(3)
  })

  test('debounced function preserves &quot;this&quot; context', () => {
    const obj = {
      value: 0,
      method: debounce(function (this: { value: number }) {
        this.value += 1
      }, 1000),
    }

    obj.method()
    jest.advanceTimersByTime(1000)
    expect(obj.value).toBe(1)
  })
})
