import { useCallback } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { L10n } from 'veysur-common'

import {
  useSurveyEditorStore,
  useSurveyEditorFocus,
  SURVEY_ENTITY_TYPE_SUBQUESTION,
  SURVEY_ENTITY_TYPE_ANSWER_OPTION,
} from 'appAdmin/component/SurveyEditor'
import { useStructuralChangeGuard } from 'appAdmin/component/SurveyEditor/hook/useStructuralChangeGuard'

interface UseSortableEntityRowParams {
  entityId: string
  entityType:
    | typeof SURVEY_ENTITY_TYPE_SUBQUESTION
    | typeof SURVEY_ENTITY_TYPE_ANSWER_OPTION
  questionId: string
  entityCode?: string
  labelL10n: L10n
  lang: string
  langDefault: string
  langEditing: string
  index: number
  totalCount: number
  onUpdateText: (
    questionId: string,
    entityId: string,
    text: string,
    lang: string,
    langDefault?: string,
  ) => void
  onDelete: (questionId: string, entityId: string) => void
}

/**
 * Shared drag/focus/edit/delete/move behaviour for a single sortable row in
 * the Matrix, Multi-Part, and point-scale Multi-Part editors — `MatrixRow`,
 * `MultiPartRow`, and `MultiPartPointScaleRow` differ only in their JSX
 * shell (`<tr>` vs `<div>`, extra preview cells); this hook is where the
 * behaviour they all share actually lives.
 */
export function useSortableEntityRow({
  entityId,
  entityType,
  questionId,
  entityCode,
  labelL10n,
  lang,
  langDefault,
  langEditing,
  index,
  totalCount,
  onUpdateText,
  onDelete,
}: UseSortableEntityRowParams) {
  const operations = useSurveyEditorStore((state) => state.operations)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `row:${entityId}`,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const { surveyFocus, setSurveyFocus } = useSurveyEditorFocus()

  const isFocused =
    surveyFocus?.entityType === entityType &&
    surveyFocus?.id === entityId &&
    surveyFocus?.parentId === questionId

  const handleFocus = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation()
      setSurveyFocus({ entityType, id: entityId, parentId: questionId })
    },
    [setSurveyFocus, entityType, entityId, questionId],
  )

  const handleTextChange = useCallback(
    (text: string) =>
      onUpdateText(questionId, entityId, text, langEditing, langDefault),
    [onUpdateText, questionId, entityId, langEditing, langDefault],
  )

  const {
    guardSubquestionRemoval,
    guardAnswerOptionRemoval,
    dialogState,
    closeDialog,
  } = useStructuralChangeGuard()

  const handleDelete = useCallback(() => {
    const commit = () => onDelete(questionId, entityId)
    if (entityType === SURVEY_ENTITY_TYPE_SUBQUESTION) {
      guardSubquestionRemoval(questionId, entityId, commit)
    } else {
      guardAnswerOptionRemoval(questionId, entityCode ?? '', commit)
    }
  }, [
    onDelete,
    questionId,
    entityId,
    entityCode,
    entityType,
    guardSubquestionRemoval,
    guardAnswerOptionRemoval,
  ])

  const handleMoveUp = useCallback(() => {
    if (entityType === SURVEY_ENTITY_TYPE_SUBQUESTION) {
      operations?.moveSubquestion?.(questionId, entityId, index - 1)
    } else {
      operations?.moveAnswerOption?.(questionId, entityId, index - 1)
    }
  }, [operations, questionId, entityId, entityType, index])

  const handleMoveDown = useCallback(() => {
    if (entityType === SURVEY_ENTITY_TYPE_SUBQUESTION) {
      operations?.moveSubquestion?.(questionId, entityId, index + 1)
    } else {
      operations?.moveAnswerOption?.(questionId, entityId, index + 1)
    }
  }, [operations, questionId, entityId, entityType, index])

  const langDefaultFull = useSurveyEditorStore((state) => state.langDefault)
  const label = labelL10n.getLang(lang, langDefault)
  const labelForDialog = labelL10n.getLang(lang, langDefaultFull)

  return {
    setNodeRef,
    style,
    attributes,
    listeners,
    isFocused,
    handleFocus,
    label,
    labelForDialog,
    handleTextChange,
    handleDelete,
    handleMoveUp: index === 0 ? undefined : handleMoveUp,
    handleMoveDown: index === totalCount - 1 ? undefined : handleMoveDown,
    dialogState,
    closeDialog,
  }
}
