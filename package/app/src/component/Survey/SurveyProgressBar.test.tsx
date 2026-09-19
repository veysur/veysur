import type React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import i18next from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { SurveyProgressBar } from './SurveyProgressBar'
import type { SurveyPresentationConfig } from './SurveyTypes'
import {
  makeQuestionItem,
  makeContentItem,
  makeQuestionWithGroup,
  makeSurveyWithSections,
} from './renderItemFixtures'

const testI18n = i18next.createInstance()
testI18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  ns: ['app-survey'],
  defaultNS: 'app-survey',
  resources: {
    en: {
      'app-survey': {
        'progress.questionOfTotal': 'Question {{current}} of {{total}}',
        'progress.pageOfTotal': 'Page {{current}} of {{total}}',
        'progress.questionRangeOfTotal_one': 'Question {{start}} of {{total}}',
        'progress.questionRangeOfTotal_other':
          'Questions {{start}} to {{end}} of {{total}}',
        'progress.answeredOfTotal_one':
          '{{answered}} of {{total}} question answered',
        'progress.answeredOfTotal_other':
          '{{answered}} of {{total}} questions answered',
      },
    },
  },
  interpolation: { escapeValue: false },
})

const renderProgressBar = (
  props: React.ComponentProps<typeof SurveyProgressBar>,
) =>
  render(
    <I18nextProvider i18n={testI18n}>
      <SurveyProgressBar {...props} />
    </I18nextProvider>,
  )

const basePresentation: SurveyPresentationConfig = {
  progressBar: true,
  questionCount: true,
}

const defaultProps = {
  presentation: basePresentation,
  getAnsweredCount: () => 0,
  getTotalItems: () => 10,
  getProgressPercentage: () => 0,
  allQuestions: Array.from({ length: 10 }, (_, i) =>
    makeQuestionWithGroup({ code: `Q${i + 1}` }),
  ),
  visibleElements: Array.from({ length: 10 }, (_, i) =>
    makeQuestionItem({ _id: `q${i + 1}`, code: `Q${i + 1}` }),
  ),
  currentGroupIndex: 0,
  currentQuestionIndex: 0,
}

describe('SurveyProgressBar', () => {
  test('question format: position text uses currentQuestionIndex, independent of answered count', () => {
    renderProgressBar({
      ...defaultProps,
      format: 'question',
      currentQuestionIndex: 2,
      getAnsweredCount: () => 0,
    })

    expect(screen.getByText('Question 3 of 10')).toBeInTheDocument()
  })

  test('question format: a content page shows no question-count line', () => {
    const visibleElements = [
      makeQuestionItem({ _id: 'q1', code: 'Q1', groupId: 'g' }),
      makeContentItem({ _id: 'c1', code: 'C1', sectionId: 'g' }),
      makeQuestionItem({ _id: 'q2', code: 'Q2', groupId: 'g' }),
    ]

    renderProgressBar({
      ...defaultProps,
      format: 'question',
      visibleElements,
      currentQuestionIndex: 1,
      allQuestions: [
        makeQuestionWithGroup({ code: 'Q1', groupId: 'g' }),
        makeQuestionWithGroup({ code: 'Q2', groupId: 'g' }),
      ],
    })

    expect(screen.queryByText(/Question \d+ of/)).not.toBeInTheDocument()
  })

  test('question format: a content page before a question does not inflate its number', () => {
    const visibleElements = [
      makeQuestionItem({ _id: 'q1', code: 'Q1', groupId: 'g' }),
      makeContentItem({ _id: 'c1', code: 'C1', sectionId: 'g' }),
      makeQuestionItem({ _id: 'q2', code: 'Q2', groupId: 'g' }),
    ]

    renderProgressBar({
      ...defaultProps,
      format: 'question',
      visibleElements,
      // Q2 sits at full-list index 2.
      currentQuestionIndex: 2,
      allQuestions: [
        makeQuestionWithGroup({ code: 'Q1', groupId: 'g' }),
        makeQuestionWithGroup({ code: 'Q2', groupId: 'g' }),
      ],
    })

    expect(screen.getByText('Question 2 of 2')).toBeInTheDocument()
  })

  test('all format: renders answered-count text', () => {
    renderProgressBar({
      ...defaultProps,
      format: 'all',
      getAnsweredCount: () => 6,
    })

    expect(screen.getByText('6 of 10 questions answered')).toBeInTheDocument()
  })

  test('all format: progress bar renders (no longer suppressed)', () => {
    const { container } = renderProgressBar({
      ...defaultProps,
      format: 'all',
      getAnsweredCount: () => 6,
      getProgressPercentage: () => 60,
    })

    expect(container.querySelector('[role="progressbar"]')).toBeInTheDocument()
  })

  test('aria-valuenow reflects answered count, not a page index', () => {
    const { container } = renderProgressBar({
      ...defaultProps,
      format: 'all',
      getAnsweredCount: () => 4,
    })

    expect(container.querySelector('[role="progressbar"]')).toHaveAttribute(
      'aria-valuenow',
      '4',
    )
  })

  test('group format: question range stays within total when display conditions hide questions', () => {
    // Survey has 3 questions in group-1 and 3 in group-2, but display
    // conditions have hidden one question from each group, leaving 4
    // visible questions overall (2 in group-1, 2 in group-2).
    const allQuestions = [
      makeQuestionWithGroup({ code: 'Q1', groupId: 'group-1' }),
      makeQuestionWithGroup({ code: 'Q2', groupId: 'group-1' }),
      makeQuestionWithGroup({ code: 'Q4', groupId: 'group-2' }),
      makeQuestionWithGroup({ code: 'Q5', groupId: 'group-2' }),
    ]

    renderProgressBar({
      ...defaultProps,
      allQuestions,
      survey: makeSurveyWithSections(['group-1', 'group-2']),
      format: 'group',
      currentGroupIndex: 1,
      getTotalItems: () => 2,
    })

    expect(screen.getByText('Questions 3 to 4 of 4')).toBeInTheDocument()
  })

  test('group format: display condition hiding the first question of currentGroupIndex 0 keeps a consistent range', () => {
    // group-1 has 3 questions total but the first is hidden by a display
    // condition, so allQuestions starts with group-1's 2nd/3rd questions.
    const allQuestions = [
      makeQuestionWithGroup({ code: 'Q2', groupId: 'group-1' }),
      makeQuestionWithGroup({ code: 'Q3', groupId: 'group-1' }),
      makeQuestionWithGroup({ code: 'Q4', groupId: 'group-2' }),
    ]

    renderProgressBar({
      ...defaultProps,
      allQuestions,
      survey: makeSurveyWithSections(['group-1', 'group-2']),
      format: 'group',
      currentGroupIndex: 0,
      getTotalItems: () => 2,
    })

    expect(screen.getByText('Questions 1 to 2 of 3')).toBeInTheDocument()
  })

  test('group format: a single visible question in the current group uses the singular plural key', () => {
    const allQuestions = [
      makeQuestionWithGroup({ code: 'Q1', groupId: 'group-1' }),
      makeQuestionWithGroup({ code: 'Q2', groupId: 'group-2' }),
      makeQuestionWithGroup({ code: 'Q3', groupId: 'group-2' }),
    ]

    renderProgressBar({
      ...defaultProps,
      allQuestions,
      survey: makeSurveyWithSections(['group-1', 'group-2']),
      format: 'group',
      currentGroupIndex: 0,
      getTotalItems: () => 2,
    })

    expect(screen.getByText('Question 1 of 3')).toBeInTheDocument()
  })

  test('group format: all questions in the current group hidden falls back to page text', () => {
    // Every visible question belongs to group-2; group-1 (currentGroupIndex 0)
    // has zero visible questions because a display condition hid all of them.
    const allQuestions = [
      makeQuestionWithGroup({ code: 'Q2', groupId: 'group-2' }),
      makeQuestionWithGroup({ code: 'Q3', groupId: 'group-2' }),
    ]

    renderProgressBar({
      ...defaultProps,
      allQuestions,
      survey: makeSurveyWithSections(['group-1', 'group-2']),
      format: 'group',
      currentGroupIndex: 0,
      getTotalItems: () => 2,
    })

    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
  })

  test('group format: no survey falls back to page text', () => {
    renderProgressBar({
      ...defaultProps,
      format: 'group',
      survey: undefined,
      currentGroupIndex: 1,
      getTotalItems: () => 3,
    })

    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument()
  })

  test('progress bar not rendered when presentation.progressBar is false', () => {
    const { container } = renderProgressBar({
      ...defaultProps,
      format: 'all',
      presentation: { ...basePresentation, progressBar: false },
    })

    expect(
      container.querySelector('[role="progressbar"]'),
    ).not.toBeInTheDocument()
  })
})
