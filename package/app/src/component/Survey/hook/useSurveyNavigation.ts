import { useState } from 'react'
import { Survey as SurveyEntity, isGroupSection } from 'veysur-common'
import type {
  SurveyFormatType,
  SurveyPresentationConfig,
  SurveyPolicyConfig,
  SurveyRenderItem,
} from '../SurveyTypes'

export const useSurveyNavigation = (
  format: SurveyFormatType,
  presentation: SurveyPresentationConfig,
  dataPolicy: SurveyPolicyConfig,
  legalNotice: SurveyPolicyConfig,
  survey: SurveyEntity | undefined,
  // The full ordered render list (questions + content pages). Only its length
  // and per-index kind matter here.
  orderedElements: SurveyRenderItem[],
) => {
  const [showWelcome, setShowWelcome] = useState(true)
  const [showQuestionIndex, setShowQuestionIndex] = useState(false)
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)

  const canGoBackToWelcome = () => {
    return !!(
      presentation.welcomeMessage ||
      dataPolicy.show ||
      legalNotice.show
    )
  }

  const canGoBack = () => {
    if (format === 'group') {
      return (
        currentGroupIndex > 0 ||
        (currentGroupIndex === 0 && presentation.questionIndex) ||
        (currentGroupIndex === 0 && canGoBackToWelcome())
      )
    } else if (format === 'question') {
      return (
        currentQuestionIndex > 0 ||
        (currentQuestionIndex === 0 && presentation.questionIndex) ||
        (currentQuestionIndex === 0 && canGoBackToWelcome())
      )
    }
    return false
  }

  const groupSectionCount = () =>
    Array.from(survey?.sections ?? []).filter(isGroupSection).length

  const isLastView = () => {
    if (format === 'group') {
      return currentGroupIndex >= groupSectionCount() - 1
    } else if (format === 'question') {
      return currentQuestionIndex >= orderedElements.length - 1
    }
    return true
  }

  const performNavigation = () => {
    if (format === 'group') {
      if (currentGroupIndex < groupSectionCount() - 1) {
        setCurrentGroupIndex((prev) => prev + 1)
      }
    } else if (format === 'question') {
      if (currentQuestionIndex < orderedElements.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1)
      }
    }
  }

  const handleBack = () => {
    if (format === 'group') {
      if (currentGroupIndex > 0) {
        setCurrentGroupIndex((prev) => prev - 1)
      } else if (currentGroupIndex === 0 && presentation.questionIndex) {
        setShowQuestionIndex(true)
      } else if (currentGroupIndex === 0 && canGoBackToWelcome()) {
        setShowWelcome(true)
      }
    } else if (format === 'question') {
      if (currentQuestionIndex > 0) {
        setCurrentQuestionIndex((prev) => prev - 1)
      } else if (currentQuestionIndex === 0 && presentation.questionIndex) {
        setShowQuestionIndex(true)
      } else if (currentQuestionIndex === 0 && canGoBackToWelcome()) {
        setShowWelcome(true)
      }
    }
  }

  const handleWelcomeContinue = () => {
    setShowWelcome(false)
    if (presentation.questionIndex) {
      setShowQuestionIndex(true)
    }
  }

  const handleQuestionIndexContinue = () => {
    setShowQuestionIndex(false)
  }

  const handleQuestionIndexBack = () => {
    if (canGoBackToWelcome()) {
      setShowQuestionIndex(false)
      setShowWelcome(true)
    }
  }

  const canGoBackFromQuestionIndex = () => {
    return canGoBackToWelcome()
  }

  const handleQuestionIndexClick = (questionIndex: number) => {
    if (format === 'question') {
      // `questionIndex` is an answerable-only index; map it to the position in
      // the full ordered list (which also holds content pages).
      let seen = -1
      const target = orderedElements.findIndex((item) => {
        if (item.kind === 'question') seen += 1
        return seen === questionIndex
      })
      setCurrentQuestionIndex(target < 0 ? 0 : target)
    } else if (format === 'group') {
      // Find which group this question belongs to
      let groupIndex = 0
      let questionCount = 0
      const groupSections = Array.from(survey?.sections ?? []).filter(
        isGroupSection,
      )
      for (let i = 0; i < groupSections.length; i++) {
        const groupQuestions = Array.from(survey?.elements ?? []).filter(
          (el) => el.sectionId === groupSections[i]._id,
        )
        if (questionCount + groupQuestions.length > questionIndex) {
          groupIndex = i
          break
        }
        questionCount += groupQuestions.length
      }
      setCurrentGroupIndex(groupIndex)
    }
    setShowQuestionIndex(false)
  }

  const shouldShowWelcome = () => {
    return (
      showWelcome &&
      (presentation.welcomeMessage || dataPolicy.show || legalNotice.show)
    )
  }

  const shouldShowQuestionIndex = () => {
    return showQuestionIndex && presentation.questionIndex
  }

  return {
    showWelcome,
    showQuestionIndex,
    currentGroupIndex,
    currentQuestionIndex,
    canGoBack,
    isLastView,
    performNavigation,
    handleBack,
    handleWelcomeContinue,
    handleQuestionIndexContinue,
    handleQuestionIndexBack,
    canGoBackFromQuestionIndex,
    handleQuestionIndexClick,
    shouldShowWelcome,
    shouldShowQuestionIndex,
    setShowWelcome,
    setShowQuestionIndex,
    setCurrentGroupIndex,
    setCurrentQuestionIndex,
  }
}
