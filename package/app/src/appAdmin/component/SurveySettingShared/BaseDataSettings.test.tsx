import { render, screen } from '@testing-library/react'

import { BaseDataSettings } from './BaseDataSettings'

describe('BaseDataSettings', () => {
  const baseHandlers = {
    YES: 'Yes',
    NO: 'No',
    handleBooleanChange: jest.fn(),
  }

  it('renders the Timestamp, Referrer URL, IP Address and Anonymise IP Address toggles', () => {
    render(
      <BaseDataSettings
        data={{ data: { ip: true }, source: {} }}
        handlers={baseHandlers}
      />,
    )

    expect(screen.getByText('Timestamp')).toBeInTheDocument()
    expect(screen.getByText('Referrer URL')).toBeInTheDocument()
    expect(screen.getByText('IP Address')).toBeInTheDocument()
    expect(screen.getByText('Anonymise IP Address')).toBeInTheDocument()
  })

  it('does not render the Save Timing Data toggle', () => {
    render(
      <BaseDataSettings
        data={{ data: {}, source: {} }}
        handlers={baseHandlers}
      />,
    )

    expect(screen.queryByText('Save Timing Data')).not.toBeInTheDocument()
  })
})
