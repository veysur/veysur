import type React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import i18next from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { ExpressionContextBuilder } from 'veysur-common'
import { SurveyWelcome } from './SurveyWelcome'
import type { SurveyContentFormatConfig } from './SurveyTypes'

const contentFormat: SurveyContentFormatConfig = {
  format: 'html',
  scriptTagsAllowed: false,
}

const testI18n = i18next.createInstance()
testI18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  ns: ['app-survey'],
  defaultNS: 'app-survey',
  resources: {
    en: {
      'app-survey': {
        'nav.startSurvey': 'Start Survey',
        'nav.continueCountdown': 'Continue ({{seconds}}s)',
        'welcome.defaultMessage': 'Welcome!',
        'welcome.dataPolicyBadge': 'Data Policy',
        'welcome.legalNoticeBadge': 'Legal Notice',
        'welcome.dataPolicyAgree': 'I have read and agree to the Data Policy',
        'welcome.legalNoticeAgree': 'I have read and agree to the Legal Notice',
        'welcome.agreementRequiredTitle': 'Agreement Required',
        'welcome.ok': 'OK',
        'welcome.warningSingle':
          'Please read and agree to the {{item}} before continuing.',
        'welcome.warningDouble':
          'Please read and agree to the {{item1}} and {{item2}} before continuing.',
        'welcome.warningGeneric':
          'Please complete all required agreements before continuing.',
      },
    },
  },
  interpolation: { escapeValue: false },
})

const renderWithI18n = (ui: React.ReactElement) =>
  render(<I18nextProvider i18n={testI18n}>{ui}</I18nextProvider>)

const createMockSurvey = (
  dataPolicyOverrides = {},
  legalNoticeOverrides = {},
) => ({
  _id: 'survey-1',
  name: 'Test Survey',
  welcomeSection: {
    desc: {
      getLang: jest.fn(
        () =>
          '<h2>Welcome</h2> Thank you for participating in this survey. Please take your time to read through the questions carefully.',
      ),
    },
  },
  dataPolicy: {
    show: false,
    text: { getLang: jest.fn(() => '') },
    ...dataPolicyOverrides,
  },
  legalNotice: {
    show: false,
    text: { getLang: jest.fn(() => '') },
    ...legalNoticeOverrides,
  },
})

const createMockPresentation = (overrides = {}) => ({
  welcomeMessage: false,
  ...overrides,
})

describe('SurveyWelcome Component', () => {
  const mockOnContinue = jest.fn()

  beforeEach(() => {
    mockOnContinue.mockClear()
  })

  test('renders welcome message when welcomeMessage is true', () => {
    const survey = createMockSurvey()
    const presentation = createMockPresentation({ welcomeMessage: true })

    renderWithI18n(
      <SurveyWelcome
        survey={survey}
        presentation={presentation}
        contentFormat={contentFormat}
        lang="eng"
        langDefault="eng"
        onContinue={mockOnContinue}
        countdown={0}
      />,
    )

    expect(screen.getByText('Welcome')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Thank you for participating in this survey. Please take your time to read through the questions carefully.',
      ),
    ).toBeInTheDocument()
  })

  test('does not render welcome message when welcomeMessage is false', () => {
    const survey = createMockSurvey()
    const presentation = createMockPresentation({ welcomeMessage: false })

    renderWithI18n(
      <SurveyWelcome
        survey={survey}
        presentation={presentation}
        contentFormat={contentFormat}
        lang="eng"
        langDefault="eng"
        onContinue={mockOnContinue}
        countdown={0}
      />,
    )

    expect(screen.queryByText('Welcome')).not.toBeInTheDocument()
  })

  test('renders privacy policy when show is true', () => {
    const survey = createMockSurvey({
      show: true,
      text: { getLang: jest.fn(() => 'Data policy content') },
    })
    const presentation = createMockPresentation()

    renderWithI18n(
      <SurveyWelcome
        survey={survey}
        presentation={presentation}
        contentFormat={contentFormat}
        lang="eng"
        langDefault="eng"
        onContinue={mockOnContinue}
        countdown={0}
      />,
    )

    expect(screen.getByText('Data Policy')).toBeInTheDocument()
    expect(screen.getByText('Data policy content')).toBeInTheDocument()
    expect(
      screen.getByText('I have read and agree to the Data Policy'),
    ).toBeInTheDocument()
  })

  test('renders legal notice when show is true', () => {
    const survey = createMockSurvey(
      {},
      {
        show: true,
        text: { getLang: jest.fn(() => 'Legal notice content') },
      },
    )
    const presentation = createMockPresentation()

    renderWithI18n(
      <SurveyWelcome
        survey={survey}
        presentation={presentation}
        contentFormat={contentFormat}
        lang="eng"
        langDefault="eng"
        onContinue={mockOnContinue}
        countdown={0}
      />,
    )

    expect(screen.getByText('Legal Notice')).toBeInTheDocument()
    expect(screen.getByText('Legal notice content')).toBeInTheDocument()
    expect(
      screen.getByText('I have read and agree to the Legal Notice'),
    ).toBeInTheDocument()
  })

  test('calls onContinue when continue button is clicked and conditions are met', () => {
    const survey = createMockSurvey()
    const presentation = createMockPresentation({ welcomeMessage: true })

    renderWithI18n(
      <SurveyWelcome
        survey={survey}
        presentation={presentation}
        contentFormat={contentFormat}
        lang="eng"
        langDefault="eng"
        onContinue={mockOnContinue}
        countdown={0}
      />,
    )

    const continueButton = screen.getByRole('button', { name: /start survey/i })
    fireEvent.click(continueButton)

    expect(mockOnContinue).toHaveBeenCalled()
  })

  test('resolves participant.* / labels.* expressions in the welcome message', () => {
    const survey = createMockSurvey()
    survey.welcomeSection.desc.getLang = jest.fn(
      () => 'Hi {{participant.nameFirst}}, this is "{{labels.G001}}".',
    )
    const presentation = createMockPresentation({ welcomeMessage: true })
    const expressionContext = ExpressionContextBuilder.build(
      { nameFirst: 'Jane' },
      [],
      [{ code: 'Q1', type: 'text', position: 0, text: 'First question' }],
      { language: 'en' },
      [{ code: 'G001', position: 0, name: 'Intro' }],
    )

    renderWithI18n(
      <SurveyWelcome
        survey={survey}
        presentation={presentation}
        contentFormat={contentFormat}
        lang="eng"
        langDefault="eng"
        expressionContext={expressionContext}
        onContinue={mockOnContinue}
        countdown={0}
      />,
    )

    expect(screen.getByText('Hi Jane, this is "Intro".')).toBeInTheDocument()
  })

  test('leaves an {{answers.*}} reference literal in the welcome message', () => {
    const survey = createMockSurvey()
    survey.welcomeSection.desc.getLang = jest.fn(
      () => 'You said {{answers.Q1}} earlier.',
    )
    const presentation = createMockPresentation({ welcomeMessage: true })
    const expressionContext = ExpressionContextBuilder.build(
      {},
      [],
      [{ code: 'Q1', type: 'text', position: 0, text: 'Q1' }],
      { language: 'en' },
      [],
    )

    renderWithI18n(
      <SurveyWelcome
        survey={survey}
        presentation={presentation}
        contentFormat={contentFormat}
        lang="eng"
        langDefault="eng"
        expressionContext={expressionContext}
        onContinue={mockOnContinue}
        countdown={0}
      />,
    )

    expect(
      screen.getByText('You said {{answers.Q1}} earlier.'),
    ).toBeInTheDocument()
  })

  test('does not call onContinue during countdown', () => {
    const survey = createMockSurvey()
    const presentation = createMockPresentation({ welcomeMessage: true })

    renderWithI18n(
      <SurveyWelcome
        survey={survey}
        presentation={presentation}
        contentFormat={contentFormat}
        lang="eng"
        langDefault="eng"
        onContinue={mockOnContinue}
        countdown={2}
      />,
    )

    const continueButton = screen.getByText('Continue (2s)')
    fireEvent.click(continueButton)

    expect(mockOnContinue).not.toHaveBeenCalled()
  })
})
