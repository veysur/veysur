import { renderHook } from '@testing-library/react'

import { useDisplayTimezone } from './useDisplayTimezone'
import { useProjectDomain } from 'hook/useProjectDomain'

jest.mock('hook/useProjectDomain')

const mockUseProjectDomain = useProjectDomain as jest.MockedFunction<
  typeof useProjectDomain
>

describe('useDisplayTimezone (appAdmin)', () => {
  it('returns the project timezone', () => {
    mockUseProjectDomain.mockReturnValue({
      timezone: 'Australia/Sydney',
    } as ReturnType<typeof useProjectDomain>)

    const { result } = renderHook(() => useDisplayTimezone())
    expect(result.current).toBe('Australia/Sydney')
  })

  it('falls back to a guessed browser zone when the project has none', () => {
    mockUseProjectDomain.mockReturnValue(null)

    const { result } = renderHook(() => useDisplayTimezone())
    // A non-empty IANA-looking zone, whatever the test machine resolves to
    expect(result.current).toEqual(
      expect.stringMatching(/^[A-Za-z]+\/[A-Za-z_]+$/),
    )
  })
})
