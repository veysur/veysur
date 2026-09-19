import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MemoryRouter } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { TokenEntryForm } from './TokenEntryForm'
import { testI18n } from './testI18n'

const renderForm = (props: { surveyId: string; error?: string }) => {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={testI18n}>
        <MemoryRouter>
          <TokenEntryForm {...props} />
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>,
  )
}

describe('TokenEntryForm', () => {
  test('renders translated title and body text', () => {
    renderForm({ surveyId: 'survey-1' })

    expect(screen.getByText('Access Token Required')).toBeInTheDocument()
    expect(
      screen.getByText('This survey requires an access token to continue.'),
    ).toBeInTheDocument()
  })

  test('shows translated validation error when submitting an empty token', () => {
    renderForm({ surveyId: 'survey-1' })

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(screen.getByText('Please enter an access token')).toBeInTheDocument()
  })

  test('renders the translated invalid-token alert when an error is passed', () => {
    renderForm({ surveyId: 'survey-1', error: 'Some server error' })

    expect(screen.getByText('Invalid Token')).toBeInTheDocument()
    expect(screen.getByText('Some server error')).toBeInTheDocument()
  })
})
