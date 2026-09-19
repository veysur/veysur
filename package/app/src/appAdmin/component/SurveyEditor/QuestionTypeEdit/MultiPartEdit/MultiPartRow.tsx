import React from 'react'
import type { L10n } from 'veysur-common'

import { cn } from 'common/cn'
import { stripHtml } from 'common/stripHtml'
import { ConfirmDialog } from 'component/DialogConfirmClickable'
import { SURVEY_ENTITY_TYPE_SUBQUESTION } from 'appAdmin/component/SurveyEditor'
import { EditableEntityLabelCell } from '../shared/EditableEntityLabelCell'
import { useSortableEntityRow } from '../shared/useSortableEntityRow'

interface MultiPartRowProps {
  entityId: string
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

/**
 * A single sortable part row in the Multi-Part editor — the trimmed sibling
 * of `MatrixRow`: drag handle, inline label editor, delete, move nav. No
 * column headers or cell-type preview grid, since Multi-Part has no
 * answer-option axis.
 */
export const MultiPartRow: React.FC<MultiPartRowProps> = React.memo(
  ({
    entityId,
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
      entityType: SURVEY_ENTITY_TYPE_SUBQUESTION,
      questionId,
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
      <div
        ref={setNodeRef}
        style={style}
        className={cn('border-t p-1 transition-colors', {
          'bg-editor-active': isFocused,
        })}
        onClick={handleFocus}
      >
        <div
          className={cn('flex flex-row items-center border-l-2 pl-1', {
            'border-primary': isFocused,
            'border-transparent': !isFocused,
          })}
        >
          <EditableEntityLabelCell
            dragHandleAttributes={attributes}
            dragHandleListeners={listeners}
            isFocused={isFocused}
            label={label}
            placeholder={stripHtml(labelForDialog) || 'Part label'}
            onTextChange={handleTextChange}
            itemType="part"
            deleteTitle="Delete Part"
            deleteMessage={`Are you sure you want to delete "${labelForDialog}"? This cannot be undone.`}
            onDelete={handleDelete}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            errors={errors}
          />
        </div>
        <ConfirmDialog
          open={dialogState.open}
          title="This part is used in a condition"
          message={dialogState.message}
          actionText="Delete anyway"
          onConfirm={dialogState.onConfirm}
          onOpenChange={(open) => !open && closeDialog()}
        />
      </div>
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

MultiPartRow.displayName = 'MultiPartRow'
