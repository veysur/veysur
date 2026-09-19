import { useMemo } from 'react'
import { User, MessageSquare, ListChecks, Tag, Type } from 'lucide-react'
import {
  SurveyEntity,
  buildSurveyStructureInfo,
  buildQuestionVariableEntries,
  buildAnswerLabelVariableEntries,
  buildLabelVariableEntries,
  buildParticipantVariableEntries,
  buildResponseVariableEntries,
  validateTextExpressions,
  TextExpressionValidationError,
  RESPONSE_FIELD_METADATA,
} from 'veysur-common'

import { useSurveyParticipantAttributeList } from 'appAdmin/component/SurveyParticipant'
import { VariablePickerGroup } from 'appAdmin/component/VariablePicker/VariablePicker'

import { useSurveyEditorStore } from './useSurveyEditorStore'
import { useQuestionPositionAvailability } from './useQuestionPositionAvailability'

/**
 * Position-aware variable picker + `{{...}}` expression validator for a
 * survey text field (question text/detail, group name/description,
 * subquestion text, answer-option label, thank-you message). Mirrors
 * `ConditionEditor`'s question-availability/forward-reference logic
 * (`package/app/src/appAdmin/component/SurveyAttribute/ConditionEditor.tsx`)
 * so a text expression can never offer, or accept, a variable the condition
 * builder would reject as a forward reference.
 *
 * @param entity - The question or group this text field belongs to, used to
 *   compute its position in survey order. Pass `'end'` for a field with no
 *   forward-reference restriction (the thank-you message), or `'start'` for a
 *   field that renders before every question (the welcome message). `labels.*`
 *   (static survey text) is exempt from the forward-reference rule entirely,
 *   so it is always offered/validated against the whole survey.
 */
export function useTextExpressionVariablePicker(
  entity: SurveyEntity | 'end' | 'start' | null,
) {
  const survey = useSurveyEditorStore((state) => state.survey)
  const langEditing = useSurveyEditorStore((state) => state.langEditing)
  const langDefault = useSurveyEditorStore((state) => state.langDefault)

  const { systemAttributes, customAttributes } =
    useSurveyParticipantAttributeList(survey?._id || '')

  const participantAttributes = useMemo(
    () =>
      [...systemAttributes, ...customAttributes].map((attr) => ({
        name: attr.name,
        label: attr.label,
      })),
    [systemAttributes, customAttributes],
  )

  const participantVariableNames = useMemo(
    () => new Set(participantAttributes.map((attr) => attr.name)),
    [participantAttributes],
  )

  const responseFields = useMemo(
    () =>
      Object.entries(RESPONSE_FIELD_METADATA).map(([name, meta]) => ({
        name,
        label: meta.label,
      })),
    [],
  )

  // `questionsInfo` / `groupsInfo` come from the same shared builder the
  // publish-time validator (`SurveyValidation`) uses, so the picker offers
  // exactly what the publish gate accepts. `position` on a group is the index
  // of its first question, so `labels.<groupCode>` obeys the same
  // forward-reference rule as a question.
  const { questionsInfo, groupsInfo } = useMemo(() => {
    if (!survey) return { questionsInfo: [], groupsInfo: [] }
    return buildSurveyStructureInfo(survey, {
      lang: langEditing || langDefault || 'en',
      langDefault: langDefault || 'en',
    })
  }, [survey, langEditing, langDefault])

  const { currentPosition, availableQuestions } =
    useQuestionPositionAvailability(survey, entity, questionsInfo)

  const availableGroups = useMemo(
    () => groupsInfo.filter((group) => group.position < currentPosition),
    [groupsInfo, currentPosition],
  )

  const variablePickerGroups: VariablePickerGroup[] = useMemo(
    () => [
      {
        label: 'Participant',
        icon: User,
        entries: buildParticipantVariableEntries(participantAttributes),
      },
      {
        label: 'Response',
        icon: MessageSquare,
        entries: buildResponseVariableEntries(responseFields),
      },
      {
        label: 'Answers',
        icon: ListChecks,
        entries: buildQuestionVariableEntries(availableQuestions),
      },
      {
        label: 'Answer labels',
        icon: Tag,
        entries: buildAnswerLabelVariableEntries(availableQuestions),
      },
      {
        // `labels.*` is static survey text - not forward-ref-restricted, so
        // the whole survey's labels are always on offer.
        label: 'Survey labels',
        icon: Type,
        entries: buildLabelVariableEntries(questionsInfo, groupsInfo),
      },
    ],
    [
      participantAttributes,
      responseFields,
      availableQuestions,
      questionsInfo,
      groupsInfo,
    ],
  )

  const validate = useMemo(
    () =>
      (html: string): TextExpressionValidationError[] =>
        validateTextExpressions(html, {
          availableQuestions,
          position: currentPosition,
          participantVariableNames,
          availableGroups,
          allQuestions: questionsInfo,
          allGroups: groupsInfo,
        }),
    [
      availableQuestions,
      currentPosition,
      participantVariableNames,
      availableGroups,
      questionsInfo,
      groupsInfo,
    ],
  )

  return { variablePickerGroups, validate }
}
