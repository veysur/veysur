import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

import { MapAnswerSummary } from './MapAnswerSummary'

jest.mock('component/SurveyQuestionType/map/MapPinView', () => ({
  MapPinView: ({ lat, lng }: { lat: number; lng: number }) => (
    <div data-testid="pin-view">{`${lat},${lng}`}</div>
  ),
}))

describe('MapAnswerSummary', () => {
  it('shows the address and loads the map only when asked', () => {
    render(
      <MapAnswerSummary
        answerValue={{
          lat: 51.5,
          lng: -0.12,
          precision: 'exact',
          address: 'London, UK',
        }}
      />,
    )

    expect(screen.getByText('London, UK')).toBeInTheDocument()
    expect(screen.queryByTestId('pin-view')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Show map' }))

    expect(screen.getByTestId('pin-view')).toHaveTextContent('51.5,-0.12')
  })

  it('shows coordinates for a pin without an address, marked approximate when coarse', () => {
    render(
      <MapAnswerSummary
        answerValue={{ lat: 51.5, lng: -0.1, precision: 'coarse' }}
      />,
    )

    expect(screen.getByText('51.5, -0.1 (approximate)')).toBeInTheDocument()
  })

  it('has no map button in print view', () => {
    render(
      <MapAnswerSummary
        answerValue={{ lat: 1, lng: 2, precision: 'exact' }}
        isPrint
      />,
    )

    expect(screen.queryByRole('button')).toBeNull()
  })

  it('shows a dash for a missing or malformed answer', () => {
    render(<MapAnswerSummary answerValue={{ lat: 'x' }} />)

    expect(screen.getByText('—')).toBeInTheDocument()
  })
})
