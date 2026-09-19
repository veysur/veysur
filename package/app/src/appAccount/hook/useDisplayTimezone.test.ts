import { renderHook } from '@testing-library/react'

import { useDisplayTimezone } from './useDisplayTimezone'

describe('useDisplayTimezone (appAccount)', () => {
  const realDateTimeFormat = Intl.DateTimeFormat

  afterEach(() => {
    Intl.DateTimeFormat = realDateTimeFormat
  })

  it('returns the browser resolved timezone', () => {
    Intl.DateTimeFormat = jest.fn().mockImplementation(() => ({
      resolvedOptions: () => ({ timeZone: 'America/New_York' }),
    })) as unknown as typeof Intl.DateTimeFormat

    const { result } = renderHook(() => useDisplayTimezone())
    expect(result.current).toBe('America/New_York')
  })

  it('falls back to UTC when the browser reports no zone', () => {
    Intl.DateTimeFormat = jest.fn().mockImplementation(() => ({
      resolvedOptions: () => ({ timeZone: '' }),
    })) as unknown as typeof Intl.DateTimeFormat

    const { result } = renderHook(() => useDisplayTimezone())
    expect(result.current).toBe('UTC')
  })
})
