import React, { useMemo } from 'react'
import type { L10n } from 'veysur-common'

import { cn } from 'common/cn'
import { stripHtml } from 'common/stripHtml'
import { ConfirmDialog } from 'component/DialogConfirmClickable'
import { SURVEY_ENTITY_TYPE_SUBQUESTION } from 'appAdmin/component/SurveyEditor'
import { EditableEntityLabelCell } from '../shared/EditableEntityLabelCell'
import { useSortableEntityRow } from '../shared/useSortableEntityRow'

import { MultiPartPointScaleCellPreview } from './MultiPartPointScaleCellPreview'

interface MultiPartPointScaleRowProps {
  entityId: string
  labelL10n: L10n
  partType: string
  pointCount: number
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
 * A single sortable part row in the point-scale Multi-Part grid — the
 * sibling of `MatrixRow`: a label cell, then one preview cell per point so
 * each cell's width matches its column header exactly.
 */
export const MultiPartPointScaleRow: React.FC<MultiPartPointScaleRowProps> =
  React.memo(
    ({
      entityId,
      labelL10n,
      partType,
      pointCount,
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

      const points = useMemo(
        () => Array.from({ length: pointCount }, (_, i) => i + 1),
        [pointCount],
      )

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
            className={cn('p-1 w-56 max-w-56 border-l-2 transition-colors', {
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
          </td>
          {points.map((pointNumber) => (
            <td key={pointNumber} className="p-2 align-middle">
              <MultiPartPointScaleCellPreview
                partType={partType}
                pointNumber={pointNumber}
                pointCount={pointCount}
              />
            </td>
          ))}
          <ConfirmDialog
            open={dialogState.open}
            title="This part is used in a condition"
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
      prev.labelL10n === next.labelL10n &&
      prev.partType === next.partType &&
      prev.pointCount === next.pointCount &&
      prev.lang === next.lang &&
      prev.langDefault === next.langDefault &&
      prev.langEditing === next.langEditing &&
      prev.index === next.index &&
      prev.totalCount === next.totalCount &&
      (prev.errors?.join('|') ?? '') === (next.errors?.join('|') ?? ''),
  )

MultiPartPointScaleRow.displayName = 'MultiPartPointScaleRow'
