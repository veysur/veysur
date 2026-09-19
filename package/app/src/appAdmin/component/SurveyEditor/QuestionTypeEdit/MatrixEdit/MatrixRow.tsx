import React from 'react'
import type { L10n } from 'veysur-common'

import { cn } from 'common/cn'
import { stripHtml } from 'common/stripHtml'
import { ConfirmDialog } from 'component/DialogConfirmClickable'
import {
  SURVEY_ENTITY_TYPE_ANSWER_OPTION,
  SURVEY_ENTITY_TYPE_SUBQUESTION,
} from 'appAdmin/component/SurveyEditor'
import { EditableEntityLabelCell } from '../shared/EditableEntityLabelCell'
import { useSortableEntityRow } from '../shared/useSortableEntityRow'

import { MatrixCellPreview } from './MatrixCellPreview'

interface MatrixRowProps {
  entityId: string
  entityCode: string
  entityType:
    | typeof SURVEY_ENTITY_TYPE_SUBQUESTION
    | typeof SURVEY_ENTITY_TYPE_ANSWER_OPTION
  labelL10n: L10n
  cellTypes: string[]
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

export const MatrixRow: React.FC<MatrixRowProps> = React.memo(
  ({
    entityId,
    entityCode,
    entityType,
    labelL10n,
    cellTypes,
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
    const {
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
      handleMoveUp,
      handleMoveDown,
      dialogState,
      closeDialog,
    } = useSortableEntityRow({
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
    })

    return (
      <tr
        ref={setNodeRef}
        style={style}
        className={cn('border-t transition-colors', {
          'bg-editor-active': isFocused,
        })}
        onClick={handleFocus}
      >
        <td
          className={cn('p-1 min-w-[160px] border-l-2 transition-colors', {
            'border-primary': isFocused,
            'border-transparent': !isFocused,
          })}
        >
          <EditableEntityLabelCell
            dragHandleAttributes={attributes}
            dragHandleListeners={listeners}
            isFocused={isFocused}
            label={label}
            placeholder={stripHtml(labelForDialog) || 'Label'}
            onTextChange={handleTextChange}
            itemType="row"
            deleteTitle="Delete Row"
            deleteMessage={`Are you sure you want to delete "${labelForDialog}"? This cannot be undone.`}
            onDelete={handleDelete}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            errors={errors}
          />
        </td>
        {cellTypes.map((cellType, i) => (
          <td key={i} className="p-2 text-center min-w-[140px]">
            <MatrixCellPreview cellType={cellType} />
          </td>
        ))}
        <ConfirmDialog
          open={dialogState.open}
          title="This row is used in a condition"
          message={dialogState.message}
          actionText="Delete anyway"
          onConfirm={dialogState.onConfirm}
          onOpenChange={(open) => !open && closeDialog()}
        />
      </tr>
    )
  },
  (prev, next) =>
    prev.entityId === next.entityId &&
    prev.entityCode === next.entityCode &&
    prev.labelL10n === next.labelL10n &&
    prev.cellTypes === next.cellTypes &&
    prev.lang === next.lang &&
    prev.langDefault === next.langDefault &&
    prev.langEditing === next.langEditing &&
    prev.index === next.index &&
    prev.totalCount === next.totalCount &&
    (prev.errors?.join('|') ?? '') === (next.errors?.join('|') ?? ''),
)

MatrixRow.displayName = 'MatrixRow'
