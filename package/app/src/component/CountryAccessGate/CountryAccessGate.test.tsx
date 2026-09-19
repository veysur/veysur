import { render, screen } from '@testing-library/react'

import { CountryAccessGate } from './CountryAccessGate'
import * as useCountryAccessHook from 'hook/useCountryAccess'

jest.mock('hook/useCountryAccess', () => ({
  useCountryAccess: jest.fn(),
}))

jest.mock('hook', () => ({
  ...jest.requireActual('hook'),
  useCountryAccess: jest.requireMock('hook/useCountryAccess').useCountryAccess,
}))

const mockUseCountryAccess = (
  overrides: Partial<ReturnType<typeof useCountryAccessHook.useCountryAccess>>,
) => {
  ;(useCountryAccessHook.useCountryAccess as jest.Mock).mockReturnValue({
    blocked: false,
    isLoading: false,
    ...overrides,
  })
}

describe('CountryAccessGate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders nothing while loading', () => {
    mockUseCountryAccess({ isLoading: true })
    const { container } = render(
      <CountryAccessGate>
        <div>protected content</div>
      </CountryAccessGate>,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders children when access is not blocked', () => {
    mockUseCountryAccess({ blocked: false, isLoading: false })
    render(
      <CountryAccessGate>
        <div>protected content</div>
      </CountryAccessGate>,
    )
    expect(screen.getByText('protected content')).toBeInTheDocument()
  })

  it('renders the unavailable card instead of children when blocked', () => {
    mockUseCountryAccess({ blocked: true, isLoading: false })
    render(
      <CountryAccessGate>
        <div>protected content</div>
      </CountryAccessGate>,
    )
    expect(screen.queryByText('protected content')).not.toBeInTheDocument()
    expect(
      screen.getByText('Service Unavailable in Your Country'),
    ).toBeInTheDocument()
  })
})
