import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { SurveyParticipant } from 'veysur-common'
import { ParticipantTokenCell } from './ParticipantTokenCell'

jest.mock('common/copyToClipboard', () => ({
  copyToClipboard: jest.fn().mockResolvedValue(true),
}))

import { copyToClipboard } from 'common/copyToClipboard'

const makeParticipant = (
  overrides: Partial<SurveyParticipant> = {},
): SurveyParticipant =>
  ({
    token: 'ABC123',
    language: '',
    ...overrides,
  }) as unknown as SurveyParticipant

describe('ParticipantTokenCell', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('copies the survey URL without a lang param when the participant has no language', async () => {
    render(
      <ParticipantTokenCell
        participant={makeParticipant({ language: '' })}
        surveyId="survey-1"
      />,
    )

    fireEvent.click(screen.getByRole('button'))

    await waitFor(() =>
      expect(copyToClipboard).toHaveBeenCalledWith(
        `${window.location.origin}/survey/survey-1/ABC123`,
      ),
    )
  })

  it('includes ?lang= when the participant has a stored language', async () => {
    render(
      <ParticipantTokenCell
        participant={makeParticipant({ language: 'zh' })}
        surveyId="survey-1"
      />,
    )

    fireEvent.click(screen.getByRole('button'))

    await waitFor(() =>
      expect(copyToClipboard).toHaveBeenCalledWith(
        `${window.location.origin}/survey/survey-1/ABC123?lang=zh`,
      ),
    )
  })

  it('renders a dash and no button when the participant has no token', () => {
    render(
      <ParticipantTokenCell
        participant={makeParticipant({ token: '' })}
        surveyId="survey-1"
      />,
    )

    expect(screen.getByText('-')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
