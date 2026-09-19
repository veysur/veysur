import {
  QuestionInfo,
  isMultiPartQuestionType,
  getLanguageName,
} from 'veysur-common'

import { stripHtml } from 'common'

export interface ParticipantAttributeOption {
  name: string
  label?: string
}

export interface ResponseFieldOption {
  name: string
  label?: string
}

// Truncate text to a maximum length with ellipsis
export function truncate(text: string | undefined, maxLength: number): string {
  if (!text) return ''
  const plainText = stripHtml(text)
  if (plainText.length <= maxLength) return plainText
  return plainText.slice(0, maxLength - 1) + '…'
}

// Format question for display: "Q001 - Question text..."
export function formatQuestion(q: QuestionInfo): string {
  if (!q.text) return q.code
  return `${q.code} - ${truncate(q.text, 30)}`
}

// Get answer option (or Multi-Part part) label from question info
export function getOptionLabel(
  question: QuestionInfo | undefined,
  code: string,
): string {
  if (question && isMultiPartQuestionType(question.type)) {
    const part = question.subquestions?.find((sq) => sq.code === code)
    if (!part?.text) return code
    return `${code} - ${truncate(part.text, 25)}`
  }
  const option = question?.answerOptions?.find((ao) => ao.code === code)
  if (!option?.label) return code
  return `${code} - ${truncate(option.label, 25)}`
}

// Format a participant attribute for display: "name" or "name - Label"
export function formatParticipantAttribute(
  attr: ParticipantAttributeOption,
): string {
  if (!attr.label || attr.label === attr.name) return attr.name
  return `${attr.name} - ${attr.label}`
}

// Format a response field for display: "name" or "name - Label"
export function formatResponseField(field: ResponseFieldOption): string {
  if (!field.label || field.label === field.name) return field.name
  return `${field.name} - ${field.label}`
}

// Format a language code for display: "en - English"
export function formatLanguage(code: string): string {
  const name = getLanguageName(code)
  return name ? `${code} - ${name}` : code
}
