import React, { useCallback } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripHorizontal, Trash2 } from 'lucide-react'
import type { L10n } from 'veysur-common'

import { cn } from 'common/cn'
import { stripHtml } from 'common/stripHtml'
import { Button } from 'component/shadcn/button'
import { ContentEditor } from 'appAdmin/component/ContentEditor'
import { DialogConfirmClickable } from 'component/DialogConfirmClickable'
import { FieldError } from 'component/Form'
import {
  useSurveyEditorStore,
  useSurveyEditorFocus,
  SURVEY_ENTITY_TYPE_ANSWER_OPTION,
  SURVEY_ENTITY_TYPE_SUBQUESTION,
} from 'appAdmin/component/SurveyEditor'
import { MoveNav } from 'appAdmin/component/SurveyEditor/MoveNav'

interface MatrixColumnHeaderProps {
  entityId: string
  entityType:
    | typeof SURVEY_ENTITY_TYPE_SUBQUESTION
    | typeof SURVEY_ENTITY_TYPE_ANSWER_OPTION
  labelL10n: L10n
  questionId: string
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
  errors?: string[]
}

export const MatrixColumnHeader: React.FC<MatrixColumnHeaderProps> = React.memo(
  ({
    entityId,
    entityType,
    labelL10n,
    questionId,
    lang,
    langDefault,
    langEditing,
    index,
    totalCount,
    onUpdateText,
    onDelete,
    errors,
  }) => {
    const operations = useSurveyEditorStore((state) => state.operations)
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: `col:${entityId}`,
    })

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    }

    const { surveyFocus, setSurveyFocus } = useSurveyEditorFocus()

    const isFocused = React.useMemo(
      () =>
        surveyFocus?.entityType === entityType &&
        surveyFocus?.id === entityId &&
        surveyFocus?.parentId === questionId,
      [surveyFocus, entityType, entityId, questionId],
    )

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

    const handleDelete = useCallback(
      () => onDelete(questionId, entityId),
      [onDelete, questionId, entityId],
    )

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

    return (
      <td
        ref={setNodeRef}
        style={style}
        className={cn(
          'p-1 min-w-[320px] align-middle border-b-1 transition-colors',
          {
            'border-primary bg-editor-active': isFocused,
          },
        )}
        onClick={handleFocus}
      >
        <div className="group/col flex flex-row items-center">
          <div className="flex w-8 flex-shrink-0 items-center">
            <GripHorizontal
              {...listeners}
              {...attributes}
              className="drag-handle h-4 w-4 cursor-grab flex-shrink-0"
            />
          </div>
          <div className="min-w-0 flex-1 text-base text-center">
            <ContentEditor
              value={label}
              variant="inline"
              placeholder={stripHtml(labelForDialog) || 'Label'}
              withToolbar={false}
              onChange={handleTextChange}
            />
            <FieldError errors={errors} />
          </div>
          <div
            className={cn(
              'flex w-24 flex-shrink-0 items-center justify-end',
              isFocused
                ? ''
                : 'invisible pointer-events-none group-hover/col:visible group-hover/col:pointer-events-auto',
            )}
          >
            <DialogConfirmClickable
              element={Button}
              title="Delete Column"
              message={`Are you sure you want to delete "${labelForDialog}"? This cannot be undone.`}
              actionText="Delete"
              confirmAction={handleDelete}
              variant="link-destructive"
              size="sm"
              className="delete"
            >
              <Trash2 className="h-4 w-4" />
            </DialogConfirmClickable>
            <MoveNav
              layout="inline"
              horizontal
              onMoveUp={index === 0 ? undefined : handleMoveUp}
              onMoveDown={index === totalCount - 1 ? undefined : handleMoveDown}
              itemType="column"
            />
          </div>
        </div>
      </td>
    )
  },
  (prev, next) =>
    prev.entityId === next.entityId &&
    prev.labelL10n === next.labelL10n &&
    prev.lang === next.lang &&
    prev.langDefault === next.langDefault &&
    prev.langEditing === next.langEditing &&
    prev.index === next.index &&
    prev.totalCount === next.totalCount &&
    (prev.errors?.join('|') ?? '') === (next.errors?.join('|') ?? ''),
)

MatrixColumnHeader.displayName = 'MatrixColumnHeader'
