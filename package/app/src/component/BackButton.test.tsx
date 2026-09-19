import { render, screen, fireEvent } from '@testing-library/react'

import { BackButton } from './BackButton'

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

jest.mock('common', () => ({
  ...jest.requireActual('common'),
  hasInAppBackHistory: jest.fn(),
}))

import { hasInAppBackHistory } from 'common'

const mockHasInAppBackHistory = hasInAppBackHistory as jest.MockedFunction<
  typeof hasInAppBackHistory
>

describe('BackButton', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    mockHasInAppBackHistory.mockReset()
  })

  it('navigates back via history when a prior in-app page is tracked', () => {
    mockHasInAppBackHistory.mockReturnValue(true)

    render(<BackButton fallbackUrl="/user" />)
    fireEvent.click(screen.getByText('Back'))

    expect(mockNavigate).toHaveBeenCalledWith(-1)
  })

  it('navigates to the fallback URL when there is no tracked in-app history', () => {
    mockHasInAppBackHistory.mockReturnValue(false)

    render(<BackButton fallbackUrl="/user" />)
    fireEvent.click(screen.getByText('Back'))

    expect(mockNavigate).toHaveBeenCalledWith('/user')
  })

  it('navigates back via history when no fallback URL is given', () => {
    mockHasInAppBackHistory.mockReturnValue(true)

    render(<BackButton />)
    fireEvent.click(screen.getByText('Back'))

    expect(mockNavigate).toHaveBeenCalledWith(-1)
  })

  it('does nothing when there is no in-app history and no fallback URL', () => {
    mockHasInAppBackHistory.mockReturnValue(false)

    render(<BackButton />)
    fireEvent.click(screen.getByText('Back'))

    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('runs a custom onClick handler instead of navigating when provided', () => {
    mockHasInAppBackHistory.mockReturnValue(true)
    const onClick = jest.fn()

    render(<BackButton fallbackUrl="/user" onClick={onClick} />)
    fireEvent.click(screen.getByText('Back'))

    expect(onClick).toHaveBeenCalled()
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
