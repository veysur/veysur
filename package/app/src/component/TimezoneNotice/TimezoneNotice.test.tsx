import { render, screen } from '@testing-library/react'

import { TimezoneNotice } from './TimezoneNotice'

describe('TimezoneNotice', () => {
  it('phrases the project variant', () => {
    render(<TimezoneNotice timezone="Europe/Berlin" mode="project" />)
    expect(
      screen.getByText('Project timezone: Europe/Berlin'),
    ).toBeInTheDocument()
  })

  it('phrases the local variant', () => {
    render(<TimezoneNotice timezone="America/New_York" mode="local" />)
    expect(
      screen.getByText('Your local timezone: America/New_York'),
    ).toBeInTheDocument()
  })

  it('phrases the fixed variant', () => {
    render(<TimezoneNotice timezone="Europe/London" mode="fixed" />)
    expect(
      screen.getByText('All times shown in Europe/London'),
    ).toBeInTheDocument()
  })

  it('renders nothing without a timezone', () => {
    const { container } = render(<TimezoneNotice timezone="" mode="fixed" />)
    expect(container).toBeEmptyDOMElement()
  })
})
