import type { QuestionWithGroup, SurveyAnswers } from './SurveyTypes'

export const isQuestionAnswered = (value: unknown): boolean => {
  if (value === undefined || value === null) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value).length > 0
  // number (including 0) and boolean (including false) all count as answered
  return true
}

export const createProgressUtils = (
  visibleQuestions: QuestionWithGroup[],
  answers: SurveyAnswers,
) => {
  const getTotalItems = () => visibleQuestions.length

  const getAnsweredCount = () =>
    visibleQuestions.filter(({ question }) =>
      isQuestionAnswered(answers[question.code]),
    ).length

  const getProgressPercentage = () => {
    const total = getTotalItems()
    return total > 0 ? Math.round((getAnsweredCount() / total) * 100) : 0
  }

  return {
    getTotalItems,
    getAnsweredCount,
    getProgressPercentage,
  }
}
