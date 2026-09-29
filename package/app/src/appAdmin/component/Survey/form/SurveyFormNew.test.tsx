import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { SurveyFormNew } from './SurveyFormNew'

const mockSurveyCreate = jest.fn()

jest.mock('../hook', () => ({
  useSurveyCreate: () => ({ surveyCreate: mockSurveyCreate, isLoading: false }),
  useSurveyTemplateList: () => ({
    templates: [
      {
        id: 'nps',
        name: 'Net Promoter Score',
        description: 'Ask the standard question.',
        category: 'Customer feedback',
        questionCount: 3,
      },
    ],
    isLoading: false,
  }),
}))

const renderForm = () =>
  render(
    <MemoryRouter>
      <SurveyFormNew />
    </MemoryRouter>,
  )

const expandTemplates = () =>
  fireEvent.click(screen.getByTestId('survey-template-toggle'))

describe('SurveyFormNew', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSurveyCreate.mockResolvedValue({ _id: 'survey-1' })
  })

  it('creates a blank survey by default, sending no template', async () => {
    renderForm()
    fireEvent.change(screen.getByLabelText(/^name/i), {
      target: { name: 'name', value: 'My survey' },
    })
    fireEvent.click(screen.getByRole('button', { name: /create survey/i }))

    await waitFor(() =>
      expect(mockSurveyCreate).toHaveBeenCalledWith(
        { name: 'My survey' },
        undefined,
      ),
    )
  })

  it('sends the chosen template id', async () => {
    renderForm()
    expandTemplates()
    fireEvent.change(screen.getByLabelText(/^name/i), {
      target: { name: 'name', value: 'My survey' },
    })
    fireEvent.click(screen.getByRole('radio', { name: /net promoter score/i }))
    fireEvent.click(screen.getByRole('button', { name: /create survey/i }))

    await waitFor(() =>
      expect(mockSurveyCreate).toHaveBeenCalledWith(
        { name: 'My survey' },
        'nps',
      ),
    )
  })

  it('shows each template name and description', () => {
    renderForm()
    expandTemplates()
    expect(screen.getByText('Net Promoter Score')).toBeInTheDocument()
    expect(screen.getByText(/Ask the standard question/)).toBeInTheDocument()
  })
})
