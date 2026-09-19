import { retryWithBackoff } from './retryWithBackoff'

describe('retryWithBackoff', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('successful execution', () => {
    it('should return result on first attempt if function succeeds', async () => {
      const mockFn = jest.fn().mockResolvedValue('success')
      const result = await retryWithBackoff(mockFn, {
        maxAttempts: 3,
        delaysMs: [500, 1000, 2000],
      })

      expect(result.success).toBe(true)
      expect(result.result).toBe('success')
      expect(result.attempts).toBe(1)
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('should return result on second attempt after one failure', async () => {
      jest.useFakeTimers()
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValue('success')

      const promise = retryWithBackoff(mockFn, {
        maxAttempts: 3,
        delaysMs: [100, 200, 400],
      })

      await jest.runAllTimersAsync()
      const result = await promise

      expect(result.success).toBe(true)
      expect(result.result).toBe('success')
      expect(result.attempts).toBe(2)
      expect(mockFn).toHaveBeenCalledTimes(2)

      jest.useRealTimers()
    })

    it('should return result on third attempt after two failures', async () => {
      jest.useFakeTimers()
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValue('success')

      const promise = retryWithBackoff(mockFn, {
        maxAttempts: 3,
        delaysMs: [100, 200, 400],
      })

      await jest.runAllTimersAsync()
      const result = await promise

      expect(result.success).toBe(true)
      expect(result.result).toBe('success')
      expect(result.attempts).toBe(3)
      expect(mockFn).toHaveBeenCalledTimes(3)

      jest.useRealTimers()
    })
  })

  describe('retry behavior', () => {
    it('should retry up to maxAttempts times', async () => {
      jest.useFakeTimers()
      const mockFn = jest.fn().mockRejectedValue(new Error('Always fails'))

      const promise = retryWithBackoff(mockFn, {
        maxAttempts: 3,
        delaysMs: [100, 200, 400],
      })

      await jest.runAllTimersAsync()
      const result = await promise

      expect(result.success).toBe(false)
      expect(result.attempts).toBe(3)
      expect(mockFn).toHaveBeenCalledTimes(3)

      jest.useRealTimers()
    })

    it('should return last error when all attempts fail', async () => {
      jest.useFakeTimers()
      const error = new Error('Final error')
      const mockFn = jest.fn().mockRejectedValue(error)

      const promise = retryWithBackoff(mockFn, {
        maxAttempts: 2,
        delaysMs: [100, 200],
      })

      await jest.runAllTimersAsync()
      const result = await promise

      expect(result.success).toBe(false)
      expect(result.error).toBe(error)
      expect(result.attempts).toBe(2)

      jest.useRealTimers()
    })

    it('should use exponential backoff delays', async () => {
      jest.useFakeTimers()
      const mockFn = jest.fn().mockRejectedValue(new Error('Fails'))
      const sleepSpy = jest.spyOn(await import('./sleep'), 'sleep')

      const promise = retryWithBackoff(mockFn, {
        maxAttempts: 3,
        delaysMs: [500, 1000, 2000],
      })

      await jest.runAllTimersAsync()
      await promise

      expect(sleepSpy).toHaveBeenCalledTimes(2)
      expect(sleepSpy).toHaveBeenNthCalledWith(1, 500)
      expect(sleepSpy).toHaveBeenNthCalledWith(2, 1000)

      jest.useRealTimers()
    })

    it('should call onRetry callback before each retry', async () => {
      jest.useFakeTimers()
      const mockFn = jest.fn().mockRejectedValue(new Error('Fails'))
      const onRetry = jest.fn()

      const promise = retryWithBackoff(mockFn, {
        maxAttempts: 3,
        delaysMs: [100, 200, 400],
        onRetry,
      })

      await jest.runAllTimersAsync()
      await promise

      expect(onRetry).toHaveBeenCalledTimes(2)
      expect(onRetry).toHaveBeenNthCalledWith(1, 1, expect.any(Error))
      expect(onRetry).toHaveBeenNthCalledWith(2, 2, expect.any(Error))

      jest.useRealTimers()
    })

    it('should not call onRetry after final failure', async () => {
      jest.useFakeTimers()
      const mockFn = jest.fn().mockRejectedValue(new Error('Fails'))
      const onRetry = jest.fn()

      const promise = retryWithBackoff(mockFn, {
        maxAttempts: 2,
        delaysMs: [100, 200],
        onRetry,
      })

      await jest.runAllTimersAsync()
      await promise

      expect(onRetry).toHaveBeenCalledTimes(1)

      jest.useRealTimers()
    })
  })

  describe('shouldRetry predicate', () => {
    it('should stop retrying when shouldRetry returns false', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('No retry'))

      const result = await retryWithBackoff(mockFn, {
        maxAttempts: 3,
        delaysMs: [100, 200, 400],
        shouldRetry: () => false,
      })

      expect(result.success).toBe(false)
      expect(result.attempts).toBe(1)
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('should continue retrying when shouldRetry returns true', async () => {
      jest.useFakeTimers()
      const mockFn = jest.fn().mockRejectedValue(new Error('Retry this'))

      const promise = retryWithBackoff(mockFn, {
        maxAttempts: 3,
        delaysMs: [100, 200, 400],
        shouldRetry: () => true,
      })

      await jest.runAllTimersAsync()
      const result = await promise

      expect(result.attempts).toBe(3)
      expect(mockFn).toHaveBeenCalledTimes(3)

      jest.useRealTimers()
    })

    it('should pass error to shouldRetry predicate', async () => {
      const error = new Error('Test error')
      const mockFn = jest.fn().mockRejectedValue(error)
      const shouldRetry = jest.fn().mockReturnValue(false)

      await retryWithBackoff(mockFn, {
        maxAttempts: 3,
        delaysMs: [100, 200, 400],
        shouldRetry,
      })

      expect(shouldRetry).toHaveBeenCalledWith(error)
    })

    it('should respect shouldRetry decision on each attempt', async () => {
      jest.useFakeTimers()
      const mockFn = jest.fn().mockRejectedValue(new Error('Test'))
      let callCount = 0
      const shouldRetry = jest.fn().mockImplementation(() => {
        callCount++
        return callCount < 2
      })

      const promise = retryWithBackoff(mockFn, {
        maxAttempts: 5,
        delaysMs: [100, 200, 400],
        shouldRetry,
      })

      await jest.runAllTimersAsync()
      const result = await promise

      expect(result.attempts).toBe(2)
      expect(mockFn).toHaveBeenCalledTimes(2)

      jest.useRealTimers()
    })
  })

  describe('edge cases', () => {
    it('should handle maxAttempts of 1', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Fails'))

      const result = await retryWithBackoff(mockFn, {
        maxAttempts: 1,
        delaysMs: [100],
      })

      expect(result.success).toBe(false)
      expect(result.attempts).toBe(1)
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('should use last delay if more attempts than delays', async () => {
      jest.useFakeTimers()
      const mockFn = jest.fn().mockRejectedValue(new Error('Fails'))
      const sleepSpy = jest.spyOn(await import('./sleep'), 'sleep')

      const promise = retryWithBackoff(mockFn, {
        maxAttempts: 5,
        delaysMs: [100, 200],
      })

      await jest.runAllTimersAsync()
      await promise

      expect(sleepSpy).toHaveBeenCalledTimes(4)
      expect(sleepSpy).toHaveBeenNthCalledWith(1, 100)
      expect(sleepSpy).toHaveBeenNthCalledWith(2, 200)
      expect(sleepSpy).toHaveBeenNthCalledWith(3, 200)
      expect(sleepSpy).toHaveBeenNthCalledWith(4, 200)

      jest.useRealTimers()
    })
  })
})
