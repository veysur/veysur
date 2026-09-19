import {
  SurveyQuestion,
  CHOICE_OTHER_CODE,
  CHOICE_OTHER_VALUE_KEY,
  isMultiPartQuestionType,
} from 'veysur-common'
import momentTimezone from 'moment-timezone'

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.substring(0, maxLength) + '...'
}

function formatMultiPartPartValue(
  partType: string,
  partValue: unknown,
): string {
  if (partValue === null || partValue === undefined || partValue === '') {
    return '—'
  }
  if (partType === 'yesNo') {
    return partValue === true || partValue === 1 || partValue === '1'
      ? 'Yes'
      : 'No'
  }
  return String(partValue)
}

function formatMultiPartAnswer(
  answerValue: unknown,
  question: SurveyQuestion,
  lang: string,
): string {
  if (typeof answerValue !== 'object' || answerValue === null) return '—'
  const data = answerValue as Record<string, unknown>
  const parts = Array.from(question.subquestions || [])
  if (parts.length === 0) return '—'
  return parts
    .map((part) => {
      const label = part.text.getLang(lang, 'en') || part.code
      return `${label}: ${formatMultiPartPartValue(part.type, data[part.code])}`
    })
    .join(', ')
}

export function formatAnswer(
  answerValue: unknown,
  question: SurveyQuestion,
  lang: string = 'en',
): string {
  // Handle null/undefined
  if (answerValue === null || answerValue === undefined) {
    return '—'
  }

  if (isMultiPartQuestionType(question.type)) {
    return formatMultiPartAnswer(answerValue, question, lang)
  }

  // Based on question.type:
  switch (question.type) {
    case 'text':
    case 'email':
    case 'phone':
      // Return string, truncate if too long
      return truncate(String(answerValue), 50)

    case 'checkbox':
    case 'dropdown':
    case 'button':
    case 'imageSelect':
      // answerValue is an object: { [optionCode]: true }
      if (
        typeof answerValue === 'object' &&
        answerValue !== null &&
        !Array.isArray(answerValue)
      ) {
        const answerObject = answerValue as Record<string, unknown>
        // Get selected option codes (keys with truthy values, excluding OTHER_VALUE)
        const selectedCodes = Object.keys(answerObject).filter(
          (k) => k !== CHOICE_OTHER_VALUE_KEY && answerObject[k],
        )
        const parts = selectedCodes
          .filter((code) => code !== CHOICE_OTHER_CODE)
          .map((code) => {
            const option = question.answerOptions?.getByCode(code)
            return option?.label ? option.label.getLang(lang, 'en') : code
          })
        if (selectedCodes.includes(CHOICE_OTHER_CODE)) {
          const otherValue = answerObject[CHOICE_OTHER_VALUE_KEY]
          parts.push(otherValue ? `Other: ${otherValue}` : 'Other')
        }
        return parts.join(', ')
      }
      // Handle single selection string (legacy or special case)
      if (typeof answerValue === 'string') {
        const option = question.answerOptions?.getByCode(answerValue)
        return option?.label ? option.label.getLang(lang, 'en') : answerValue
      }
      return String(answerValue)

    case 'yesNo':
      return answerValue === true || answerValue === 1 || answerValue === '1'
        ? 'Yes'
        : 'No'

    case 'starRating':
    case 'point5':
    case 'point10':
      return String(answerValue)

    case 'yes-no':
      return answerValue === '1' ? 'Yes' : 'No'

    case 'date':
    case 'date-time':
      // Format date nicely
      return momentTimezone(answerValue).format('L')

    case 'number':
    case 'money':
      return String(answerValue)

    case 'ranking': {
      const rankingValue = answerValue as { ORDER?: unknown } | null
      const order: string[] = Array.isArray(rankingValue?.ORDER)
        ? (rankingValue.ORDER as string[])
        : []
      if (order.length === 0) return '—'
      return order
        .map((code: string, i: number) => {
          const option = question.answerOptions?.getByCode(code)
          const label = option?.label ? option.label.getLang(lang, 'en') : code
          return `${i + 1}. ${label}`
        })
        .join(', ')
    }

    case 'matrix':
      if (typeof answerValue === 'object' && answerValue !== null) {
        const count = Object.values(
          answerValue as Record<string, unknown>,
        ).filter(
          (row) =>
            row && Object.keys(row as Record<string, unknown>).length > 0,
        ).length
        return `${count} answers`
      }
      return '—'

    default:
      if (typeof answerValue === 'object' && answerValue !== null) {
        return `${Object.keys(answerValue).length} answers`
      }
      return String(answerValue)
  }
}
