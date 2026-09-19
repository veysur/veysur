import { render, screen } from '@testing-library/react'

import { Accordion } from 'component/shadcn/accordion'

jest.mock('appAdmin/hook', () => ({
  ...jest.requireActual('appAdmin/hook'),
  useDisplayTimezone: () => 'UTC',
}))

import { ResponseDetailsSection } from './ResponseDetailsSection'

const renderSection = (
  overrides: Partial<{
    ip: string | null
    referrerUrl: string | null
    completed: boolean
    completedAt: Date | null
    createdAt: Date | string
    updatedAt: Date | string
    anonymous: boolean
  }> = {},
): ReturnType<typeof render> =>
  render(
    <Accordion type="single" defaultValue="response">
      <ResponseDetailsSection
        anonymous={overrides.anonymous}
        response={{
          _id: 'response-1',
          createdAt: overrides.createdAt ?? new Date('2026-01-01'),
          updatedAt: overrides.updatedAt ?? new Date('2026-01-01'),
          ip: overrides.ip,
          referrerUrl: overrides.referrerUrl,
          completed: overrides.completed,
          completedAt: overrides.completedAt,
        }}
      />
    </Accordion>,
  )

describe('ResponseDetailsSection', () => {
  it('renders the IP address when present', () => {
    renderSection({ ip: '8.8.8.0' })

    expect(screen.getByText('IP Address')).toBeInTheDocument()
    expect(screen.getByText('8.8.8.0')).toBeInTheDocument()
  })

  it('renders nothing for IP address when absent', () => {
    renderSection({ ip: null })

    expect(screen.queryByText('IP Address')).not.toBeInTheDocument()
  })

  it('renders the referrer URL when present', () => {
    renderSection({ referrerUrl: 'https://example.com/landing' })

    expect(screen.getByText('Referrer URL')).toBeInTheDocument()
    expect(screen.getByText('https://example.com/landing')).toBeInTheDocument()
  })

  it('renders nothing for referrer URL when absent', () => {
    renderSection({ referrerUrl: null })

    expect(screen.queryByText('Referrer URL')).not.toBeInTheDocument()
  })

  it('renders a Completed indicator without a date when completed=true and completedAt is null', () => {
    renderSection({ completed: true, completedAt: null })

    expect(screen.getByText('Completed')).toBeInTheDocument()
    expect(screen.getByText('Yes')).toBeInTheDocument()
  })

  it('renders the completion date when both completed and completedAt are present', () => {
    renderSection({ completed: true, completedAt: new Date('2026-01-02') })

    expect(screen.getByText('Completed')).toBeInTheDocument()
    expect(screen.queryByText('Yes')).not.toBeInTheDocument()
  })

  it('renders nothing for Completed when the response is not completed', () => {
    renderSection({ completed: false, completedAt: null })

    expect(screen.queryByText('Completed')).not.toBeInTheDocument()
  })

  it('shows "Anonymised" for every timestamp when anonymous', () => {
    renderSection({
      anonymous: true,
      completed: true,
      completedAt: new Date('1971-01-01T00:00:01Z'),
    })

    expect(screen.getAllByText('Anonymised')).toHaveLength(3)
    expect(screen.queryByText(/2026/)).not.toBeInTheDocument()
  })

  it('shows "Anonymised" when a timestamp carries the sentinel value even without the flag', () => {
    renderSection({
      createdAt: new Date('1971-01-01T00:00:01Z'),
      updatedAt: new Date('2026-01-01'),
    })

    expect(screen.getByText('Anonymised')).toBeInTheDocument()
  })
})
