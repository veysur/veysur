import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { SurveyLanguageSelector } from './SurveyLanguageSelector'

describe('SurveyLanguageSelector', () => {
  const mockOnLanguageChange = jest.fn()

  beforeEach(() => {
    mockOnLanguageChange.mockClear()
  })

  test('does not render when only one language available', () => {
    render(
      <SurveyLanguageSelector
        availableLanguages={['en']}
        langEditing="en"
        onLanguageChange={mockOnLanguageChange}
      />,
    )

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  test('renders dropdown when multiple languages available', () => {
    render(
      <SurveyLanguageSelector
        availableLanguages={['en', 'fr']}
        langEditing="en"
        onLanguageChange={mockOnLanguageChange}
      />,
    )

    // Button should display "English" (from Iso639v1 lookup)
    expect(screen.getByText('English')).toBeInTheDocument()
  })

  test('renders correct language text in button', () => {
    render(
      <SurveyLanguageSelector
        availableLanguages={['en', 'fr']}
        langEditing="en"
        onLanguageChange={mockOnLanguageChange}
      />,
    )

    // Button should show English text
    expect(screen.getByText('English')).toBeInTheDocument()
  })

  test('displays current language in toggle button', () => {
    render(
      <SurveyLanguageSelector
        availableLanguages={['en', 'fr']}
        langEditing="fr"
        onLanguageChange={mockOnLanguageChange}
      />,
    )

    // Should display French (or fallback to code if lookup fails)
    const button = screen.getByRole('button')
    expect(button).toHaveTextContent(/French|fr/)
  })

  test('shows fallback text when current language is empty', () => {
    render(
      <SurveyLanguageSelector
        availableLanguages={['en', 'fr']}
        langEditing=""
        onLanguageChange={mockOnLanguageChange}
      />,
    )

    expect(screen.getByText('Language')).toBeInTheDocument()
  })
})
