import React from 'react'
import { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core'
import { GripVertical, Trash2 } from 'lucide-react'

import { cn } from 'common/cn'
import { Button } from 'component/shadcn/button'
import { ContentEditor } from 'appAdmin/component/ContentEditor'
import { DialogConfirmClickable } from 'component/DialogConfirmClickable'
import { FieldError } from 'component/Form'
import { MoveNav } from 'appAdmin/component/SurveyEditor/MoveNav'

interface EditableEntityLabelCellProps {
  dragHandleAttributes: DraggableAttributes
  dragHandleListeners: DraggableSyntheticListeners
  isFocused: boolean
  label: string
  placeholder: string
  onTextChange: (text: string) => void
  itemType: string
  deleteTitle: string
  deleteMessage: string
  onDelete: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  /** `{{expression}}` validation messages for this label, shown beneath it. */
  errors?: string[]
}

/**
 * Drag handle + inline label editor + delete + move-nav — the row content
 * shared by `MatrixRow`, `MultiPartRow`, and `MultiPartPointScaleRow`. Each
 * caller owns its own outer draggable element (`<tr>`/`<div>`, `useSortable`
 * ref/style, focus tracking) and renders this inside it.
 */
export const EditableEntityLabelCell: React.FC<
  EditableEntityLabelCellProps
> = ({
  dragHandleAttributes,
  dragHandleListeners,
  isFocused,
  label,
  placeholder,
  onTextChange,
  itemType,
  deleteTitle,
  deleteMessage,
  onDelete,
  onMoveUp,
  onMoveDown,
  errors,
}) => (
  <div className="group/row flex flex-1 flex-row items-center">
    <GripVertical
      {...dragHandleListeners}
      {...dragHandleAttributes}
      className="drag-handle mr-1 h-4 w-4 flex-shrink-0 cursor-grab"
    />
    <div className="min-w-0 flex-1 text-base">
      <ContentEditor
        value={label}
        variant="inline"
        placeholder={placeholder}
        withToolbar={false}
        onChange={onTextChange}
      />
      <FieldError errors={errors} />
    </div>
    <div
      className={cn(
        'flex flex-shrink-0 items-center',
        isFocused
          ? ''
          : 'invisible pointer-events-none group-hover/row:visible group-hover/row:pointer-events-auto',
      )}
    >
      <DialogConfirmClickable
        element={Button}
        title={deleteTitle}
        message={deleteMessage}
        actionText="Delete"
        confirmAction={onDelete}
        variant="link-destructive"
        size="sm"
        className="delete"
      >
        <Trash2 className="h-4 w-4" />
      </DialogConfirmClickable>
      <MoveNav
        layout="inline"
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        itemType={itemType}
      />
    </div>
  </div>
)
