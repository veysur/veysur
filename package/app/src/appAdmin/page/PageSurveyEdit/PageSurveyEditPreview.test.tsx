import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

import { PageSurveyEditPreview } from './PageSurveyEditPreview'

jest.mock('react-i18next', () => ({
  ...jest.requireActual('react-i18next'),
  useTranslation: () => ({ t: (key: string) => key }),
}))

jest.mock('appAdmin/i18n', () => ({
  __esModule: true,
  default: { changeLanguage: jest.fn() },
}))

jest.mock('appAdmin/component/SurveyEditor', () => ({
  SurveyEditorNavContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="nav-container">{children}</div>
  ),
  useSurveyEditorStore: (
    selector: (state: {
      survey: { name: string; language: { default: string } }
      defaults: undefined
      langEditing: string
      setLangEditing: () => void
    }) => unknown,
  ) =>
    selector({
      survey: { name: 'Test Survey', language: { default: 'en' } },
      defaults: undefined,
      langEditing: 'en',
      setLangEditing: jest.fn(),
    }),
  useLangFetchSwitch: () => jest.fn(),
}))

jest.mock('appAdmin/component/SurveyEditorPublish', () => ({
  SurveyEditorPublish: () => <div data-testid="publish" />,
}))

jest.mock('component/Survey', () => ({
  Survey: ({
    onComplete,
    onPrint,
  }: {
    onComplete?: (answers: Record<string, unknown>) => void
    onPrint?: () => void
  }) => (
    <div data-testid="survey-preview">
      <button onClick={() => onComplete?.({ Q1: 'Ada Lovelace' })}>
        Complete Survey
      </button>
      <button onClick={onPrint}>Print</button>
    </div>
  ),
  SurveyPrintView: ({ answers }: { answers: Record<string, unknown> }) => (
    <div data-testid="survey-print-view">{JSON.stringify(answers)}</div>
  ),
}))

describe('PageSurveyEditPreview', () => {
  test('shows the live preview by default', () => {
    render(<PageSurveyEditPreview />)

    expect(screen.getByTestId('survey-preview')).toBeInTheDocument()
    expect(screen.queryByTestId('survey-print-view')).not.toBeInTheDocument()
  })

  test('does not switch to the print view before the preview survey is completed', () => {
    render(<PageSurveyEditPreview />)

    fireEvent.click(screen.getByText('Print'))

    expect(screen.getByTestId('survey-preview')).toBeInTheDocument()
    expect(screen.queryByTestId('survey-print-view')).not.toBeInTheDocument()
  })

  test('switches to the print view with the captured answers once completed and printed, then back again', () => {
    render(<PageSurveyEditPreview />)

    fireEvent.click(screen.getByText('Complete Survey'))
    fireEvent.click(screen.getByText('Print'))

    expect(screen.getByTestId('survey-print-view')).toHaveTextContent(
      'Ada Lovelace',
    )
    expect(screen.queryByTestId('survey-preview')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('print.backToSurvey'))

    expect(screen.getByTestId('survey-preview')).toBeInTheDocument()
    expect(screen.queryByTestId('survey-print-view')).not.toBeInTheDocument()
  })
})
