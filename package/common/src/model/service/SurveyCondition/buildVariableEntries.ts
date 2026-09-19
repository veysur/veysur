import { GroupInfo, QuestionInfo } from './types'
import { isMultiPartQuestionType } from '../../constructor/Survey/MultiPart'
import { isMatrixQuestionType } from '../../constructor/Survey/Matrix'

export interface VariableEntry {
  /** Dotted path, e.g. `answers.Q001.A001`, `participant.email` */
  path: string
  /** Human-readable label for display in a variable picker */
  label: string
}

/**
 * Builds `participant.<name>` entries from a survey's participant variable
 * list (system + custom attributes), for use in a variable-picker UI. Shared
 * by `ConditionEditor`, `BaseEmailTemplateSettings`, and `BaseNotifySettings`
 * so all three enumerate participant variables identically.
 */
export function buildParticipantVariableEntries(
  attributes: { name: string; label?: string }[],
): VariableEntry[] {
  return attributes.map((attr) => ({
    path: `participant.${attr.name}`,
    label: attr.label || attr.name,
  }))
}

/**
 * Builds `response.<field>` entries from the fixed, system-defined
 * response-metadata field list, for use in a variable-picker UI. Kept
 * separate from `buildParticipantVariableEntries` since response fields
 * aren't survey-admin-extensible - the input is always
 * `RESPONSE_FIELD_METADATA`, not per-survey data.
 */
export function buildResponseVariableEntries(
  fields: { name: string; label?: string }[],
): VariableEntry[] {
  return fields.map((field) => ({
    path: `response.${field.name}`,
    label: field.label || field.name,
  }))
}

/**
 * Builds `answers.<code>` entries (plus every addressable sub-path - answer
 * options, matrix cells, multi-part parts) from a survey's questions, for use
 * in a variable-picker UI. Mirrors the addressing rules `ConditionParser`/
 * `ConditionGenerator` already enforce for condition expressions.
 */
export function buildQuestionVariableEntries(
  questionsInfo: QuestionInfo[],
): VariableEntry[] {
  const entries: VariableEntry[] = []

  for (const question of questionsInfo) {
    const questionLabel = question.text || question.code

    entries.push({
      path: `answers.${question.code}`,
      label: questionLabel,
    })

    if (question.subquestions && question.subquestions.length > 0) {
      if (isMultiPartQuestionType(question.type)) {
        for (const part of question.subquestions) {
          entries.push({
            path: `answers.${question.code}.${part.code}`,
            label: `${questionLabel} — ${part.text || part.code}`,
          })
        }
      } else {
        const options: { code: string; label?: string }[] =
          question.answerOptions ??
          (question.answerOptionCodes || []).map((code) => ({ code }))
        for (const subquestion of question.subquestions) {
          for (const option of options) {
            entries.push({
              path: `answers.${question.code}.${subquestion.code}.${option.code}`,
              label: `${questionLabel} — ${subquestion.text || subquestion.code} — ${option.label || option.code}`,
            })
          }
        }
      }
      continue
    }

    if (question.answerOptions && question.answerOptions.length > 0) {
      for (const option of question.answerOptions) {
        entries.push({
          path: `answers.${question.code}.${option.code}`,
          label: `${questionLabel} — ${option.label || option.code}`,
        })
      }
    } else if (question.answerOptionCodes) {
      for (const code of question.answerOptionCodes) {
        entries.push({
          path: `answers.${question.code}.${code}`,
          label: `${questionLabel} — ${code}`,
        })
      }
    }
  }

  return entries
}

/**
 * Builds `answerLabels.<code>` entries - the human-readable rendering of an
 * answer (selected option label(s), scalar value) rather than the raw stored
 * value `answers.*` exposes. Same addressing axes as
 * `buildQuestionVariableEntries`; caller supplies the position-filtered
 * question list.
 */
export function buildAnswerLabelVariableEntries(
  questionsInfo: QuestionInfo[],
): VariableEntry[] {
  const entries: VariableEntry[] = []

  for (const question of questionsInfo) {
    const questionLabel = question.text || question.code
    entries.push({
      path: `answerLabels.${question.code}`,
      label: `${questionLabel} — answer`,
    })

    if (isMultiPartQuestionType(question.type)) {
      for (const part of question.subquestions ?? []) {
        entries.push({
          path: `answerLabels.${question.code}.${part.code}`,
          label: `${questionLabel} — ${part.text || part.code} (answer)`,
        })
      }
      continue
    }

    if (isMatrixQuestionType(question.type)) {
      const options: { code: string; label?: string }[] =
        question.answerOptions ??
        (question.answerOptionCodes || []).map((code) => ({ code }))
      for (const subquestion of question.subquestions ?? []) {
        const subLabel = subquestion.text || subquestion.code
        entries.push({
          path: `answerLabels.${question.code}.${subquestion.code}`,
          label: `${questionLabel} — ${subLabel} (answer)`,
        })
        for (const option of options) {
          entries.push({
            path: `answerLabels.${question.code}.${subquestion.code}.${option.code}`,
            label: `${questionLabel} — ${subLabel} — ${option.label || option.code} (answer)`,
          })
        }
      }
      continue
    }

    for (const option of question.answerOptions ?? []) {
      entries.push({
        path: `answerLabels.${question.code}.${option.code}`,
        label: `${questionLabel} — ${option.label || option.code} (label)`,
      })
    }
  }

  return entries
}

/**
 * Builds `labels.<code>` entries - static survey text (question text/detail,
 * group name/description, matrix row / Multi-Part part text, answer-option
 * labels), answer-independent. Named for symmetry with `answerLabels.*` (the
 * selected-answer rendering). Caller supplies the question and group lists.
 */
export function buildLabelVariableEntries(
  questionsInfo: QuestionInfo[],
  groupsInfo: GroupInfo[],
): VariableEntry[] {
  const entries: VariableEntry[] = []

  for (const group of groupsInfo) {
    const groupLabel = group.name || group.code
    entries.push({
      path: `labels.${group.code}`,
      label: `${groupLabel} — group name`,
    })
    if (group.desc !== undefined) {
      entries.push({
        path: `labels.${group.code}.desc`,
        label: `${groupLabel} — group description`,
      })
    }
  }

  for (const question of questionsInfo) {
    const questionLabel = question.text || question.code
    entries.push({
      path: `labels.${question.code}`,
      label: `${questionLabel} — question text`,
    })
    if (question.detail !== undefined) {
      entries.push({
        path: `labels.${question.code}.detail`,
        label: `${questionLabel} — question detail`,
      })
    }
    for (const subquestion of question.subquestions ?? []) {
      entries.push({
        path: `labels.${question.code}.${subquestion.code}`,
        label: `${questionLabel} — ${subquestion.text || subquestion.code}`,
      })
    }
    for (const option of question.answerOptions ?? []) {
      entries.push({
        path: `labels.${question.code}.${option.code}`,
        label: `${questionLabel} — ${option.label || option.code} (label)`,
      })
    }
  }

  return entries
}
