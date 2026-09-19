import { useState } from 'react'
import {
  buildEntityValidateConfig,
  Survey,
  SurveyQuestion,
  SurveyResponseValidator,
  ValidatableQuestion,
} from 'veysur-common'

import type {
  QuestionWithGroup,
  SurveyAnswers,
  ValidationErrors,
} from '../SurveyTypes'
import { debug } from '../debugUtils'

const validator = new SurveyResponseValidator()

// Condition is intentionally omitted: allQuestions is already filtered to
// what's visible, and re-evaluating .condition here would double-filter
// without the groups/participantData context the validator needs to do it.
function toValidatable(question: SurveyQuestion): ValidatableQuestion {
  return {
    code: question.code,
    type: question.type,
    sectionId: question.sectionId,
    attributes: question.attributes,
    subquestions: Array.from(question.subquestions ?? []),
    answerOptions: Array.from(question.answerOptions ?? []),
  }
}

// Navigation gating only ever checked "required" (including the required
// "Other" free-text value and required matrix subquestions/cells), never
// the fuller constraints (choiceMinMax, lengthMinMax, numberMinMax, etc.)
// that validateQuestion/validateAllAnswers enforce. Stripping attributes
// down to required/choiceOther, and subquestions down to required-only,
// reproduces that narrower check via the shared validator.
function toNavValidatable(question: SurveyQuestion): ValidatableQuestion {
  const attributes = question.attributes ?? {}
  return {
    code: question.code,
    type: question.type,
    sectionId: question.sectionId,
    attributes: {
      required: attributes.required,
      choiceOther: attributes.choiceOther,
    },
    subquestions: Array.from(question.subquestions ?? []).filter((sq) =>
      Boolean(sq.attributes?.required),
    ),
    answerOptions: Array.from(question.answerOptions ?? []),
  }
}

export const useSurveyValidation = (
  allQuestions: QuestionWithGroup[],
  language: string,
  defaultLanguage: string,
) => {
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})

  const validateQuestion = async (questionCode: string, value: unknown) => {
    const question = allQuestions.find(
      (item) => item.question.code === questionCode,
    )?.question
    if (!question) return true

    const { isValid, errors } = await validator.validate(
      [toValidatable(question)],
      { [questionCode]: value },
      { language, defaultLanguage },
    )

    setValidationErrors((prev) => {
      const newErrors = { ...prev }
      const questionErrors = errors[questionCode]
      if (Array.isArray(questionErrors) && questionErrors.length > 0) {
        newErrors[questionCode] = questionErrors
      } else {
        delete newErrors[questionCode]
      }
      return newErrors
    })

    return isValid
  }

  const validateCurrentView = async (
    format: string,
    _survey: Survey | undefined,
    currentGroupIndex: number,
    currentQuestionIndex: number,
    answers: SurveyAnswers,
  ): Promise<boolean> => {
    let questionsToValidate: SurveyQuestion[] = []

    if (format === 'group') {
      // Get unique groups in sorted order from allQuestions (already sorted)
      const sortedGroups = Array.from(
        new Map(
          allQuestions.map((item) => [item.group._id, item.group]),
        ).values(),
      )
      const currentGroup = sortedGroups[currentGroupIndex]
      if (currentGroup) {
        // Use allQuestions to match what's actually being rendered
        questionsToValidate = allQuestions
          .filter((item) => item.group._id === currentGroup._id)
          .map((item) => item.question)
      }
    } else if (format === 'question') {
      const currentItem = allQuestions[currentQuestionIndex]
      if (currentItem) {
        questionsToValidate = [currentItem.question]
      }
    } else {
      return true
    }

    if (questionsToValidate.length === 0) {
      return true
    }

    const answersToValidate: Record<string, unknown> = {}
    questionsToValidate.forEach((question) => {
      answersToValidate[question.code] = answers[question.code]
    })

    const { isValid, errors } = await validator.validate(
      questionsToValidate.map(toNavValidatable),
      answersToValidate,
      { language, defaultLanguage },
    )

    debug('Navigation validation result:', {
      answersToValidate,
      isValid,
      errors,
    })

    setValidationErrors((prev) => {
      const newErrors = { ...prev }

      // Clear errors for all questions in current view
      questionsToValidate.forEach((question) => {
        delete newErrors[question.code]
      })

      // Add new errors from validation
      for (const [code, questionErrors] of Object.entries(errors)) {
        if (Array.isArray(questionErrors) && questionErrors.length > 0) {
          newErrors[code] = questionErrors
        }
      }

      return newErrors
    })

    return isValid
  }

  const validateAllAnswers = async (
    answers: SurveyAnswers,
  ): Promise<boolean> => {
    const { isValid, errors } = await validator.validate(
      allQuestions.map((item) => toValidatable(item.question)),
      answers,
      { language, defaultLanguage },
    )

    const combinedErrors: ValidationErrors = {}
    for (const [code, questionErrors] of Object.entries(errors)) {
      if (Array.isArray(questionErrors) && questionErrors.length > 0) {
        combinedErrors[code] = questionErrors
      }
    }

    setValidationErrors(combinedErrors)
    return isValid
  }

  const hasRequiredQuestionsInCurrentView = (
    format: string,
    _survey: Survey | undefined,
    currentGroupIndex: number,
    currentQuestionIndex: number,
  ): boolean => {
    let questionsToCheck: SurveyQuestion[] = []

    if (format === 'group') {
      // Get unique groups in sorted order from allQuestions (already sorted)
      const sortedGroups = Array.from(
        new Map(
          allQuestions.map((item) => [item.group._id, item.group]),
        ).values(),
      )
      const currentGroup = sortedGroups[currentGroupIndex]
      if (currentGroup) {
        // Use allQuestions to match what's actually being rendered
        questionsToCheck = allQuestions
          .filter((item) => item.group._id === currentGroup._id)
          .map((item) => item.question)
      }
    } else if (format === 'question') {
      const currentItem = allQuestions[currentQuestionIndex]
      if (currentItem) {
        questionsToCheck = [currentItem.question]
      }
    }

    const hasRequired = questionsToCheck.some((question) =>
      Boolean(question.attributes?.required),
    )
    const hasMatrixConstraints = questionsToCheck.some((q) =>
      q.subquestions?.some(
        (sq) => Object.keys(buildEntityValidateConfig(sq)).length > 0,
      ),
    )
    debug('Checking for required questions:', {
      format,
      questionsToCheck: questionsToCheck.map((q) => ({
        code: q.code,
        required: q.attributes?.required,
        requiredBoolean: Boolean(q.attributes?.required),
      })),
      hasRequired,
      hasMatrixConstraints,
    })
    return hasRequired || hasMatrixConstraints
  }

  return {
    validationErrors,
    validateQuestion,
    validateCurrentView,
    validateAllAnswers,
    hasRequiredQuestionsInCurrentView,
  }
}
