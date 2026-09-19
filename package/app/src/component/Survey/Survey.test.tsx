import { render, screen, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Survey as SurveyEntity, SettingSurvey } from 'veysur-common'
import { Survey } from './Survey'

type MockPresentation = {
  backNav?: boolean
  navDelay?: number
  progressBar?: boolean
  questionCount?: boolean
  groupName?: boolean
  questionNum?: boolean
  questionCode?: boolean
  questionDetail?: boolean
  questionIndex?: boolean
  welcomeMessage?: boolean
  format?: string
}

// Mock the sub-components
jest.mock('./SurveyNavigation', () => ({
  SurveyNavigation: ({
    presentation,
    isLastView,
    onContinue,
    onBack,
    onSubmit,
    countdown,
  }: {
    presentation: MockPresentation
    isLastView: boolean
    onContinue: () => void
    onBack: () => void
    onSubmit: () => void
    countdown: number
  }) => (
    <div data-testid="survey-navigation">
      <div data-testid="back-nav-enabled">
        {presentation.backNav ? 'true' : 'false'}
      </div>
      <div data-testid="nav-delay">{presentation.navDelay}</div>
      <div data-testid="countdown">{countdown}</div>
      {presentation.backNav && <button onClick={onBack}>Back</button>}
      {isLastView ? (
        <button onClick={onSubmit} disabled={countdown > 0}>
          {countdown > 0 ? `Submit (${countdown}s)` : 'Submit'}
        </button>
      ) : (
        <button onClick={onContinue} disabled={countdown > 0}>
          {countdown > 0 ? `Continue (${countdown}s)` : 'Continue'}
        </button>
      )}
    </div>
  ),
}))

jest.mock('./SurveyProgressBar', () => ({
  SurveyProgressBar: ({
    presentation,
    survey,
    currentGroupIndex,
    getTotalItems,
    getProgressPercentage,
  }: {
    presentation: MockPresentation
    survey?: { sections?: Array<{ _id: string }> }
    currentGroupIndex: number
    getTotalItems?: () => number
    getProgressPercentage?: () => number
  }) => (
    <div data-testid="survey-progress-bar">
      <div data-testid="progress-bar-enabled">
        {presentation.progressBar ? 'true' : 'false'}
      </div>
      <div data-testid="question-count-enabled">
        {presentation.questionCount ? 'true' : 'false'}
      </div>
      <div data-testid="progress-bar-current-group-id">
        {survey?.sections?.[currentGroupIndex]?._id ?? ''}
      </div>
      <div data-testid="progress-total-items">{getTotalItems?.() ?? ''}</div>
      <div data-testid="progress-percentage">
        {getProgressPercentage?.() ?? ''}
      </div>
    </div>
  ),
}))

type MockRenderItem = {
  kind: string
  question?: { _id: string; code: string }
  element?: { _id: string; code: string }
}

jest.mock('./SurveyFormatAll', () => ({
  SurveyFormatAll: ({
    presentation,
    allElements,
  }: {
    presentation: MockPresentation
    allElements?: MockRenderItem[]
  }) => (
    <div data-testid="survey-format-all">
      <div data-testid="group-name-enabled">
        {presentation.groupName ? 'true' : 'false'}
      </div>
      <div data-testid="question-num-enabled">
        {presentation.questionNum ? 'true' : 'false'}
      </div>
      <div data-testid="question-code-enabled">
        {presentation.questionCode ? 'true' : 'false'}
      </div>
      <div data-testid="question-desc-enabled">
        {presentation.questionDetail ? 'true' : 'false'}
      </div>
      <div data-testid="question-index-enabled">
        {presentation.questionIndex ? 'true' : 'false'}
      </div>
      <div data-testid="all-elements-kinds">
        {(allElements ?? []).map((i) => i.kind).join(',')}
      </div>
    </div>
  ),
}))

jest.mock('./SurveyFormatGroup', () => ({
  SurveyFormatGroup: ({ presentation }: { presentation: MockPresentation }) => (
    <div data-testid="survey-format-group">
      <div data-testid="group-name-enabled">
        {presentation.groupName ? 'true' : 'false'}
      </div>
      <div data-testid="question-num-enabled">
        {presentation.questionNum ? 'true' : 'false'}
      </div>
      <div data-testid="question-code-enabled">
        {presentation.questionCode ? 'true' : 'false'}
      </div>
      <div data-testid="question-desc-enabled">
        {presentation.questionDetail ? 'true' : 'false'}
      </div>
      <div data-testid="question-index-enabled">
        {presentation.questionIndex ? 'true' : 'false'}
      </div>
    </div>
  ),
}))

jest.mock('./SurveyFormatQuestion', () => ({
  SurveyFormatQuestion: ({
    presentation,
    allElements,
    currentQuestionIndex,
  }: {
    presentation: MockPresentation
    allElements?: MockRenderItem[]
    currentQuestionIndex?: number
  }) => (
    <div data-testid="survey-format-question">
      <div data-testid="group-name-enabled">
        {presentation.groupName ? 'true' : 'false'}
      </div>
      <div data-testid="question-num-enabled">
        {presentation.questionNum ? 'true' : 'false'}
      </div>
      <div data-testid="question-code-enabled">
        {presentation.questionCode ? 'true' : 'false'}
      </div>
      <div data-testid="question-desc-enabled">
        {presentation.questionDetail ? 'true' : 'false'}
      </div>
      <div data-testid="question-index-enabled">
        {presentation.questionIndex ? 'true' : 'false'}
      </div>
      <div data-testid="current-item-kind">
        {allElements?.[currentQuestionIndex ?? 0]?.kind ?? ''}
      </div>
    </div>
  ),
}))

jest.mock('./SurveyWelcome', () => ({
  SurveyWelcome: ({
    presentation,
    survey,
    onContinue,
    countdown,
  }: {
    presentation: MockPresentation
    survey?: {
      dataPolicy?: { show?: boolean }
      legalNotice?: { show?: boolean }
    }
    onContinue: () => void
    countdown: number
  }) => (
    <div data-testid="survey-welcome">
      <div data-testid="welcome-message-enabled">
        {presentation.welcomeMessage ? 'true' : 'false'}
      </div>
      <div data-testid="privacy-policy-show">
        {survey?.dataPolicy?.show ? 'true' : 'false'}
      </div>
      <div data-testid="legal-notice-show">
        {survey?.legalNotice?.show ? 'true' : 'false'}
      </div>
      <button onClick={onContinue} disabled={countdown > 0}>
        {countdown > 0 ? `Continue (${countdown}s)` : 'Continue'}
      </button>
    </div>
  ),
}))

jest.mock('./SurveyIndexMenu', () => ({
  SurveyIndexMenu: ({ show }: { show: boolean }) => (
    <div data-testid="survey-index-menu">{show ? 'visible' : 'hidden'}</div>
  ),
}))

const createMockDefaults = (overrides = {}) => {
  return {
    language: {
      default: 'en',
      options: ['en'],
    },
    presentation: {
      format: 'all' as const,
      noAnswer: false,
      title: false,
      welcomeMessage: false,
      progressBar: false,
      questionCount: false,
      groupName: true,
      groupDesc: false,
      questionNum: false,
      questionCode: false,
      questionDetail: false,
      questionIndex: false,
      backNav: false,
      redirectEnd: false,
      navDelay: 0,
      print: false,
      stats: false,
    },
    participant: {
      htmlEmail: false,
      thankYouEmail: false,
      tokenLength: 8,
    },
    data: {
      timestamp: true,
      ip: false,
      anonymiseIp: true,
      referrerUrl: false,
      timings: false,
      assessment: false,
    },
    access: {
      anonymous: false,
      open: false,
      publicReg: false,
      index: false,
      tokenPersist: false,
      multiple: false,
      repeatCookie: false,
      resumeLink: false,
      captcha: false,
      captchaReg: false,
      captchaResume: false,
    },
    dataPolicy: {
      show: false,
      link: false,
      text: { getLang: jest.fn(() => '') },
    },
    legalNotice: {
      show: false,
      link: false,
      text: { getLang: jest.fn(() => '') },
    },
    schedule: {
      start: null,
      end: null,
    },
    notify: {
      basic: '',
      detailed: '',
    },
    contentFormat: {
      htmlAllowed: false,
      markdownAllowed: true,
      scriptTagsAllowed: false,
    },
    ...overrides,
  } as unknown as SettingSurvey
}

const createMockSurvey = (
  presentationOverrides = {},
  languageOverrides = {},
  dataPolicyOverrides = {},
  legalNoticeOverrides = {},
) => {
  const language = {
    default: 'en',
    options: ['en'],
    ...languageOverrides,
  }
  return {
    _id: 'survey-1',
    name: 'Test Survey',
    title: { getLang: jest.fn(() => 'Test Survey Title') },
    language,
    getLanguage: jest.fn(() => language),
    getPresentation: jest.fn((defaults) => ({
      ...defaults.presentation,
      ...presentationOverrides,
    })),
    getContentFormat: jest.fn((defaults) => ({ ...defaults.contentFormat })),
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
    sections: [
      {
        _id: 'group-1',
        name: { getLang: jest.fn(() => 'Group 1') },
      },
      {
        _id: 'group-2',
        name: { getLang: jest.fn(() => 'Group 2') },
      },
    ],
    questions: {
      getByGroupId: jest.fn((groupId) => {
        if (groupId === 'group-1') {
          return [
            {
              _id: 'q1',
              text: { getLang: jest.fn(() => 'Question 1') },
              code: 'Q1',
              desc: { getLang: jest.fn(() => 'Desc 1') },
            },
            {
              _id: 'q2',
              text: { getLang: jest.fn(() => 'Question 2') },
              code: 'Q2',
              desc: { getLang: jest.fn(() => 'Desc 2') },
            },
          ]
        }
        if (groupId === 'group-2') {
          return [
            {
              _id: 'q3',
              text: { getLang: jest.fn(() => 'Question 3') },
              code: 'Q3',
              desc: { getLang: jest.fn(() => 'Desc 3') },
            },
          ]
        }
        return []
      }),
    },
  } as unknown as SurveyEntity
}

describe('Survey Component', () => {
  describe('Format Settings', () => {
    test('renders all format when presentation.format is "all"', () => {
      const settingSurvey = createMockDefaults()
      const survey = createMockSurvey({ format: 'all' })

      render(<Survey settingSurvey={settingSurvey} survey={survey} />)

      expect(screen.getByTestId('survey-format-all')).toBeInTheDocument()
      expect(
        screen.queryByTestId('survey-format-group'),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByTestId('survey-format-question'),
      ).not.toBeInTheDocument()
    })

    test('renders group format when presentation.format is "group"', () => {
      const settingSurvey = createMockDefaults({
        presentation: { ...createMockDefaults().presentation, format: 'group' },
      })
      const survey = createMockSurvey({ format: 'group' })

      render(<Survey settingSurvey={settingSurvey} survey={survey} />)

      expect(screen.getByTestId('survey-format-group')).toBeInTheDocument()
      expect(screen.queryByTestId('survey-format-all')).not.toBeInTheDocument()
      expect(
        screen.queryByTestId('survey-format-question'),
      ).not.toBeInTheDocument()
    })

    test('renders question format when presentation.format is "question"', () => {
      const settingSurvey = createMockDefaults({
        presentation: {
          ...createMockDefaults().presentation,
          format: 'question',
        },
      })
      const survey = createMockSurvey({ format: 'question' })

      render(<Survey settingSurvey={settingSurvey} survey={survey} />)

      expect(screen.getByTestId('survey-format-question')).toBeInTheDocument()
      expect(screen.queryByTestId('survey-format-all')).not.toBeInTheDocument()
      expect(
        screen.queryByTestId('survey-format-group'),
      ).not.toBeInTheDocument()
    })
  })

  describe('Progress Bar Settings', () => {
    test('passes progressBar setting to SurveyProgressBar', () => {
      const settingSurvey = createMockDefaults({
        presentation: {
          ...createMockDefaults().presentation,
          progressBar: true,
          questionCount: false,
        },
      })
      const survey = createMockSurvey({
        progressBar: true,
        questionCount: false,
      })

      render(<Survey settingSurvey={settingSurvey} survey={survey} />)

      expect(screen.getByTestId('progress-bar-enabled')).toHaveTextContent(
        'true',
      )
      expect(screen.getByTestId('question-count-enabled')).toHaveTextContent(
        'false',
      )
    })

    test('passes questionCount setting to SurveyProgressBar', () => {
      const settingSurvey = createMockDefaults({
        presentation: {
          ...createMockDefaults().presentation,
          progressBar: false,
          questionCount: true,
        },
      })
      const survey = createMockSurvey({
        progressBar: false,
        questionCount: true,
      })

      render(<Survey settingSurvey={settingSurvey} survey={survey} />)

      expect(screen.getByTestId('progress-bar-enabled')).toHaveTextContent(
        'false',
      )
      expect(screen.getByTestId('question-count-enabled')).toHaveTextContent(
        'true',
      )
    })

    // Regression test: the real survey-taking flow fetches a survey whose
    // `groups`/`questions` arrays are in raw/insertion order, not sort order,
    // whereas the admin preview's data hook pre-sorts before rendering. Survey
    // must apply sort order itself before handing the survey to
    // SurveyProgressBar, or its `survey.sections.groups()[currentGroupIndex]` lookup
    // resolves to the wrong group (e.g. showing "Questions 22 to 26 of 26" on
    // page 1 instead of the group actually displayed there).
    test('passes a sort-order-applied survey to SurveyProgressBar, not the raw survey', () => {
      const settingSurvey = createMockDefaults({
        presentation: {
          ...createMockDefaults().presentation,
          format: 'group',
          progressBar: true,
        },
      })

      const groupOne = {
        _id: 'group-1',
        name: { getLang: jest.fn(() => 'Group 1') },
      }
      const groupTwo = {
        _id: 'group-2',
        name: { getLang: jest.fn(() => 'Group 2') },
      }

      const survey = {
        _id: 'survey-1',
        name: 'Test Survey',
        title: { getLang: jest.fn(() => 'Test Survey Title') },
        language: { default: 'en', options: ['en'] },
        getLanguage: jest.fn(() => ({ default: 'en', options: ['en'] })),
        getPresentation: jest.fn((defaults) => ({
          ...defaults.presentation,
          format: 'group',
          progressBar: true,
        })),
        getContentFormat: jest.fn((defaults) => ({
          ...defaults.contentFormat,
        })),
        dataPolicy: { show: false, text: { getLang: jest.fn(() => '') } },
        legalNotice: { show: false, text: { getLang: jest.fn(() => '') } },
        // Raw array order, as returned by the API — NOT display order.
        sections: [groupTwo, groupOne],
        // Display/sort order: group-1 is shown first.
        sectionIds: ['group-1', 'group-2'],
        elementIds: ['q1', 'q2'],
        elements: [
          {
            _id: 'q1',
            sectionId: 'group-1',
            code: 'Q1',
            text: { getLang: jest.fn(() => 'Question 1') },
          },
          {
            _id: 'q2',
            sectionId: 'group-2',
            code: 'Q2',
            text: { getLang: jest.fn(() => 'Question 2') },
          },
        ],
        applySortOrder: jest.fn(function (this: {
          sections: Array<{ _id: string }>
          elements: Array<{ _id: string }>
          sectionIds: string[]
          elementIds: string[]
        }) {
          const sectionMap = new Map(
            this.sections.map((s: { _id: string }) => [s._id, s]),
          )
          const elementMap = new Map(
            this.elements.map((e: { _id: string }) => [e._id, e]),
          )
          return {
            ...this,
            sections: this.sectionIds
              .map((id: string) => sectionMap.get(id))
              .filter(Boolean),
            elements: this.elementIds
              .map((id: string) => elementMap.get(id))
              .filter(Boolean),
          }
        }),
      } as unknown as SurveyEntity

      render(<Survey settingSurvey={settingSurvey} survey={survey} />)

      // Page 1 (currentGroupIndex 0) must resolve to group-1 — the group
      // that is actually first in display/sort order — not group-2, which
      // is first only in the raw `groups` array.
      expect(
        screen.getByTestId('progress-bar-current-group-id'),
      ).toHaveTextContent('group-1')
    })
  })

  describe('Display Settings', () => {
    test.each([
      ['groupName', true, 'group-name-enabled'],
      ['groupName', false, 'group-name-enabled'],
      ['questionNum', true, 'question-num-enabled'],
      ['questionNum', false, 'question-num-enabled'],
      ['questionCode', true, 'question-code-enabled'],
      ['questionCode', false, 'question-code-enabled'],
      ['questionDetail', true, 'question-desc-enabled'],
      ['questionDetail', false, 'question-desc-enabled'],
      ['questionIndex', true, 'question-index-enabled'],
      ['questionIndex', false, 'question-index-enabled'],
    ])('passes %s=%s to format components', (setting, value, testId) => {
      const settingSurvey = createMockDefaults({
        presentation: {
          ...createMockDefaults().presentation,
          [setting]: value,
        },
      })
      const survey = createMockSurvey({ [setting]: value })

      render(<Survey settingSurvey={settingSurvey} survey={survey} />)

      expect(screen.getByTestId(testId)).toHaveTextContent(value.toString())
    })
  })

  describe('Navigation Settings', () => {
    test('passes backNav setting to SurveyNavigation', () => {
      const settingSurvey = createMockDefaults({
        presentation: {
          ...createMockDefaults().presentation,
          format: 'group',
          backNav: true,
        },
      })
      const survey = createMockSurvey({ format: 'group', backNav: true })

      render(<Survey settingSurvey={settingSurvey} survey={survey} />)

      expect(screen.getByTestId('back-nav-enabled')).toHaveTextContent('true')
    })

    test('passes navDelay setting to SurveyNavigation', () => {
      const settingSurvey = createMockDefaults({
        presentation: {
          ...createMockDefaults().presentation,
          format: 'group',
          navDelay: 1000,
        },
      })
      const survey = createMockSurvey({ format: 'group', navDelay: 1000 })

      render(<Survey settingSurvey={settingSurvey} survey={survey} />)

      expect(screen.getByTestId('nav-delay')).toHaveTextContent('1000')
    })
  })

  describe('Navigation Behavior', () => {
    test('starts countdown immediately on page load when navDelay is set', async () => {
      jest.useFakeTimers()
      const settingSurvey = createMockDefaults({
        presentation: {
          ...createMockDefaults().presentation,
          format: 'group',
          navDelay: 3,
        },
      })
      const survey = createMockSurvey({ format: 'group', navDelay: 3 })

      render(<Survey settingSurvey={settingSurvey} survey={survey} />)

      // Should start with countdown immediately
      expect(screen.getByTestId('countdown')).toHaveTextContent('3')
      expect(screen.getByText('Continue (3s)')).toBeInTheDocument()

      // Advance 1 second
      act(() => {
        jest.advanceTimersByTime(1000)
      })
      expect(screen.getByTestId('countdown')).toHaveTextContent('2')
      expect(screen.getByText('Continue (2s)')).toBeInTheDocument()

      // Advance another second
      act(() => {
        jest.advanceTimersByTime(1000)
      })
      expect(screen.getByTestId('countdown')).toHaveTextContent('1')
      expect(screen.getByText('Continue (1s)')).toBeInTheDocument()

      // Advance final second - countdown should reach 0
      act(() => {
        jest.advanceTimersByTime(1000)
      })
      expect(screen.getByTestId('countdown')).toHaveTextContent('0')
      expect(screen.getByText('Continue')).toBeInTheDocument()

      jest.useRealTimers()
    })

    test('button is disabled during countdown and enabled after', () => {
      jest.useFakeTimers()
      const settingSurvey = createMockDefaults({
        presentation: {
          ...createMockDefaults().presentation,
          format: 'group',
          navDelay: 2,
        },
      })
      const survey = createMockSurvey({ format: 'group', navDelay: 2 })

      render(<Survey settingSurvey={settingSurvey} survey={survey} />)

      // Initially button should be disabled with countdown
      expect(screen.getByTestId('countdown')).toHaveTextContent('2')
      const continueButton = screen.getByText('Continue (2s)')
      expect(continueButton).toBeDisabled()

      // Advance 1 second
      act(() => {
        jest.advanceTimersByTime(1000)
      })
      expect(screen.getByTestId('countdown')).toHaveTextContent('1')
      expect(screen.getByText('Continue (1s)')).toBeDisabled()

      // Advance final second
      act(() => {
        jest.advanceTimersByTime(1000)
      })
      expect(screen.getByTestId('countdown')).toHaveTextContent('0')
      const enabledButton = screen.getByText('Continue')
      expect(enabledButton).not.toBeDisabled()

      jest.useRealTimers()
    })

    test('navigation works after countdown finishes', () => {
      jest.useFakeTimers()
      const settingSurvey = createMockDefaults({
        presentation: {
          ...createMockDefaults().presentation,
          format: 'group',
          navDelay: 1,
        },
      })
      const survey = createMockSurvey({ format: 'group', navDelay: 1 })

      render(<Survey settingSurvey={settingSurvey} survey={survey} />)

      // Wait for countdown to finish
      act(() => {
        jest.advanceTimersByTime(1000)
      })

      const continueButton = screen.getByText('Continue')
      expect(continueButton).not.toBeDisabled()

      // Click should work now and start new countdown for next page
      act(() => {
        fireEvent.click(continueButton)
      })

      // Should start new countdown for next page
      expect(screen.getByTestId('countdown')).toHaveTextContent('1')

      jest.useRealTimers()
    })

    test('clicking during countdown does nothing', () => {
      jest.useFakeTimers()
      const settingSurvey = createMockDefaults({
        presentation: {
          ...createMockDefaults().presentation,
          format: 'group',
          navDelay: 3,
        },
      })
      const survey = createMockSurvey({ format: 'group', navDelay: 3 })

      render(<Survey settingSurvey={settingSurvey} survey={survey} />)

      const continueButton = screen.getByText('Continue (3s)')
      expect(continueButton).toBeDisabled()

      // Try clicking - should do nothing
      act(() => {
        fireEvent.click(continueButton)
      })

      // Countdown should continue normally
      act(() => {
        jest.advanceTimersByTime(1000)
      })
      expect(screen.getByTestId('countdown')).toHaveTextContent('2')

      jest.useRealTimers()
    })
  })

  describe('Language Selector', () => {
    test('does not render language selector when only one language option', () => {
      const settingSurvey = createMockDefaults()
      const survey = createMockSurvey({}, { options: ['en'] })

      render(<Survey settingSurvey={settingSurvey} survey={survey} />)

      // Check for language selector container instead
      expect(screen.queryByText('English')).not.toBeInTheDocument()
    })

    test('renders language selector when multiple language options', () => {
      const settingSurvey = createMockDefaults()
      const survey = createMockSurvey(
        {},
        { options: ['en', 'fr', 'es'], default: 'en' },
      )

      render(<Survey settingSurvey={settingSurvey} survey={survey} />)

      // Should show English in the language selector
      expect(screen.getByText('English')).toBeInTheDocument()
    })

    test('displays language selector with correct initial language', () => {
      const settingSurvey = createMockDefaults()
      const survey = createMockSurvey(
        {},
        { options: ['en', 'fr'], default: 'en' },
      )

      render(<Survey settingSurvey={settingSurvey} survey={survey} />)

      // Should show English in the language selector button
      expect(screen.getByText('English')).toBeInTheDocument()
    })

    test('uses survey default language as initial language', () => {
      const settingSurvey = createMockDefaults()
      const survey = createMockSurvey(
        {},
        { options: ['en', 'fr'], default: 'fr' },
      )

      render(<Survey settingSurvey={settingSurvey} survey={survey} />)

      // Should show French (or fallback to code) as the initial language
      // Find the language selector button specifically using class name
      const languageSelector = document.querySelector('.language-toggle')
      expect(languageSelector).toHaveTextContent(/French|fra/)
    })
  })

  describe('Default Settings', () => {
    test('applies default presentation settings when survey.presentation is undefined', () => {
      const settingSurvey = createMockDefaults()
      const survey = {
        ...createMockSurvey(),
        getPresentation: jest.fn(() => settingSurvey.presentation),
      } as unknown as SurveyEntity

      render(<Survey settingSurvey={settingSurvey} survey={survey} />)

      // Should default to 'all' format
      expect(screen.getByTestId('survey-format-all')).toBeInTheDocument()

      // Should have default settings
      expect(screen.getByTestId('progress-bar-enabled')).toHaveTextContent(
        'false',
      )
      expect(screen.getByTestId('question-count-enabled')).toHaveTextContent(
        'false',
      )
      expect(screen.getByTestId('group-name-enabled')).toHaveTextContent('true')
      expect(screen.getByTestId('back-nav-enabled')).toHaveTextContent('false')
    })
  })

  describe('Welcome Screen', () => {
    test('shows welcome screen when welcomeMessage is true', () => {
      const settingSurvey = createMockDefaults({
        presentation: {
          ...createMockDefaults().presentation,
          welcomeMessage: true,
        },
      })
      const survey = createMockSurvey({ welcomeMessage: true })

      render(<Survey settingSurvey={settingSurvey} survey={survey} />)

      expect(screen.getByTestId('survey-welcome')).toBeInTheDocument()
      expect(screen.getByTestId('welcome-message-enabled')).toHaveTextContent(
        'true',
      )
      expect(screen.queryByTestId('survey-format-all')).not.toBeInTheDocument()
    })

    test('shows welcome screen when privacy policy is enabled', () => {
      const settingSurvey = createMockDefaults()
      const survey = createMockSurvey({}, {}, { show: true })

      render(<Survey settingSurvey={settingSurvey} survey={survey} />)

      expect(screen.getByTestId('survey-welcome')).toBeInTheDocument()
      expect(screen.getByTestId('privacy-policy-show')).toHaveTextContent(
        'true',
      )
      expect(screen.queryByTestId('survey-format-all')).not.toBeInTheDocument()
    })

    test('shows welcome screen when legal notice is enabled', () => {
      const settingSurvey = createMockDefaults()
      const survey = createMockSurvey({}, {}, {}, { show: true })

      render(<Survey settingSurvey={settingSurvey} survey={survey} />)

      expect(screen.getByTestId('survey-welcome')).toBeInTheDocument()
      expect(screen.getByTestId('legal-notice-show')).toHaveTextContent('true')
      expect(screen.queryByTestId('survey-format-all')).not.toBeInTheDocument()
    })

    test('does not show welcome screen when welcomeMessage, privacy policy, and legal notice are all disabled', () => {
      const settingSurvey = createMockDefaults({
        presentation: {
          ...createMockDefaults().presentation,
          welcomeMessage: false,
        },
      })
      const survey = createMockSurvey({ welcomeMessage: false })

      render(<Survey settingSurvey={settingSurvey} survey={survey} />)

      expect(screen.queryByTestId('survey-welcome')).not.toBeInTheDocument()
      expect(screen.getByTestId('survey-format-all')).toBeInTheDocument()
    })

    test('hides progress bar and navigation when showing welcome screen', () => {
      const settingSurvey = createMockDefaults({
        presentation: {
          ...createMockDefaults().presentation,
          welcomeMessage: true,
          progressBar: true,
        },
      })
      const survey = createMockSurvey({
        welcomeMessage: true,
        progressBar: true,
      })

      render(<Survey settingSurvey={settingSurvey} survey={survey} />)

      expect(screen.getByTestId('survey-welcome')).toBeInTheDocument()
      expect(
        screen.queryByTestId('survey-progress-bar'),
      ).not.toBeInTheDocument()
      expect(screen.queryByTestId('survey-navigation')).not.toBeInTheDocument()
    })

    test('transitions from welcome screen to main content when continue is clicked', () => {
      const settingSurvey = createMockDefaults({
        presentation: {
          ...createMockDefaults().presentation,
          welcomeMessage: true,
        },
      })
      const survey = createMockSurvey({ welcomeMessage: true })

      render(<Survey settingSurvey={settingSurvey} survey={survey} />)

      expect(screen.getByTestId('survey-welcome')).toBeInTheDocument()

      const continueButton = screen.getByText('Continue')
      fireEvent.click(continueButton)

      expect(screen.queryByTestId('survey-welcome')).not.toBeInTheDocument()
      expect(screen.getByTestId('survey-format-all')).toBeInTheDocument()
    })

    test('welcome screen respects countdown timer', () => {
      const settingSurvey = createMockDefaults({
        presentation: {
          ...createMockDefaults().presentation,
          welcomeMessage: true,
          navDelay: 3,
        },
      })
      const survey = createMockSurvey({ welcomeMessage: true, navDelay: 3 })

      render(<Survey settingSurvey={settingSurvey} survey={survey} />)

      expect(screen.getByTestId('survey-welcome')).toBeInTheDocument()
      expect(screen.getByText('Continue (3s)')).toBeInTheDocument()
    })
  })

  describe('Redirect End', () => {
    const setWindowLocationHref = (href: string) => {
      delete (window as unknown as { location?: Location }).location
      ;(window as unknown as { location: Location }).location = {
        href,
      } as unknown as Location
    }

    const completeSurvey = async () => {
      const submitButton = screen.getByText('Submit')
      await act(async () => {
        fireEvent.click(submitButton)
      })
    }

    test('redirects to the thank you link URL when redirectEnd is enabled', async () => {
      setWindowLocationHref('')
      const settingSurvey = createMockDefaults({
        presentation: {
          ...createMockDefaults().presentation,
          redirectEnd: true,
        },
      })
      const survey = createMockSurvey({ redirectEnd: true })
      Object.assign(survey, {
        thankYouSection: {
          config: { link: { url: { en: 'https://example.com/thanks' } } },
        },
      })

      render(<Survey settingSurvey={settingSurvey} survey={survey} />)
      await completeSurvey()

      expect(window.location.href).toBe('https://example.com/thanks')
    })

    test('does not redirect when redirectEnd is disabled', async () => {
      setWindowLocationHref('')
      const settingSurvey = createMockDefaults()
      const survey = createMockSurvey({ redirectEnd: false })
      Object.assign(survey, {
        thankYouSection: {
          config: { link: { url: { en: 'https://example.com/thanks' } } },
        },
      })

      render(<Survey settingSurvey={settingSurvey} survey={survey} />)
      await completeSurvey()

      expect(window.location.href).toBe('')
    })

    test('does not redirect when redirectEnd is enabled but no link URL is configured', async () => {
      setWindowLocationHref('')
      const settingSurvey = createMockDefaults({
        presentation: {
          ...createMockDefaults().presentation,
          redirectEnd: true,
        },
      })
      const survey = createMockSurvey({ redirectEnd: true })
      Object.assign(survey, {
        thankYouSection: { config: { link: { url: {} } } },
      })

      render(<Survey settingSurvey={settingSurvey} survey={survey} />)
      await completeSurvey()

      expect(window.location.href).toBe('')
    })
  })

  describe('onComplete', () => {
    test('calls onComplete with the final answers on submit', async () => {
      const settingSurvey = createMockDefaults()
      const survey = createMockSurvey()
      const onComplete = jest.fn()

      render(
        <Survey
          settingSurvey={settingSurvey}
          survey={survey}
          onComplete={onComplete}
        />,
      )

      const submitButton = screen.getByText('Submit')
      await act(async () => {
        fireEvent.click(submitButton)
      })

      expect(onComplete).toHaveBeenCalledTimes(1)
      expect(onComplete).toHaveBeenCalledWith(expect.any(Object))
    })

    test('does not throw when onComplete is not provided', async () => {
      const settingSurvey = createMockDefaults()
      const survey = createMockSurvey()

      const { container } = render(
        <Survey settingSurvey={settingSurvey} survey={survey} />,
      )

      const submitButton = screen.getByText('Submit')
      await act(async () => {
        fireEvent.click(submitButton)
      })

      expect(container.querySelector('.survey-thank-you')).toBeInTheDocument()
    })
  })

  describe('content elements', () => {
    const buildSurveyWithContent = (
      contentOverrides: Record<string, unknown> = {},
      presentationOverrides: Record<string, unknown> = {},
    ) => {
      let s = new SurveyEntity({ _id: 'survey-1', createdById: 'u1' })
      s = s.update({
        presentation: {
          format: 'all',
          groupName: true,
          ...presentationOverrides,
        },
        language: { default: 'en', options: ['en'] },
      })
      s = s.addSection({})
      const groupId = s.sections.groups()[0]._id
      s = s.addQuestion(groupId, { type: 'text' })
      const q1 = s.elements.questions()[0]
      s = s.addContent(
        groupId,
        {
          type: 'contentText',
          text: { en: 'An interlude' },
          ...contentOverrides,
        },
        { afterId: q1._id },
      )
      s = s.addQuestion(groupId, { type: 'text' })
      return s.applySortOrder()
    }

    test('interleaves a content element between two questions in render order', () => {
      const settingSurvey = createMockDefaults()
      render(
        <Survey
          settingSurvey={settingSurvey}
          survey={buildSurveyWithContent()}
        />,
      )
      expect(screen.getByTestId('all-elements-kinds')).toHaveTextContent(
        'question,content,question',
      )
    })

    test('progress denominator counts only the answerable questions', () => {
      const settingSurvey = createMockDefaults()
      render(
        <Survey
          settingSurvey={settingSurvey}
          survey={buildSurveyWithContent({}, { progressBar: true })}
        />,
      )
      expect(screen.getByTestId('progress-total-items')).toHaveTextContent('2')
    })

    test('a conditioned content element is hidden when the condition is false', () => {
      const survey = buildSurveyWithContent({
        condition: 'answers.Q001 === "yes"',
      })
      const { unmount } = render(
        <Survey
          settingSurvey={createMockDefaults()}
          survey={survey}
          initAnswers={{ Q001: 'no' }}
        />,
      )
      expect(screen.getByTestId('all-elements-kinds')).toHaveTextContent(
        'question,question',
      )
      unmount()
    })

    test('a conditioned content element is shown when the condition is true', () => {
      const survey = buildSurveyWithContent({
        condition: 'answers.Q001 === "yes"',
      })
      render(
        <Survey
          settingSurvey={createMockDefaults()}
          survey={survey}
          initAnswers={{ Q001: 'yes' }}
        />,
      )
      expect(screen.getByTestId('all-elements-kinds')).toHaveTextContent(
        'question,content,question',
      )
    })

    test('a content element is its own page in question format', async () => {
      const settingSurvey = createMockDefaults()
      const survey = buildSurveyWithContent({}, { format: 'question' })
      render(
        <Survey
          settingSurvey={settingSurvey}
          survey={survey}
          initAnswers={{ Q001: 'answered' }}
        />,
      )
      // Page 0 is the first question.
      expect(screen.getByTestId('current-item-kind')).toHaveTextContent(
        'question',
      )
      await act(async () => {
        fireEvent.click(screen.getByText('Continue'))
      })
      expect(screen.getByTestId('current-item-kind')).toHaveTextContent(
        'content',
      )
    })
  })
})
