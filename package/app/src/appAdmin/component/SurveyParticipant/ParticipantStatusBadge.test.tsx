import { render, screen } from '@testing-library/react'

import { ParticipantStatusBadge } from './ParticipantStatusBadge'

describe('ParticipantStatusBadge', () => {
  test('renders "Not started" for notStarted', () => {
    render(<ParticipantStatusBadge status="notStarted" />)
    expect(screen.getByText('Not started')).toBeInTheDocument()
  })

  test('renders "In progress" for inProgress', () => {
    render(<ParticipantStatusBadge status="inProgress" />)
    expect(screen.getByText('In progress')).toBeInTheDocument()
  })

  test('renders "Completed" for completed', () => {
    render(<ParticipantStatusBadge status="completed" />)
    expect(screen.getByText('Completed')).toBeInTheDocument()
  })
})
