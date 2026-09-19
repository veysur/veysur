import React from 'react'
import { Edit, Trash2 } from 'lucide-react'

import { cn } from 'common/cn'
import { Button } from 'component/shadcn/button'
import { DialogConfirmClickable } from 'component/DialogConfirmClickable'

interface ImageAnswerOptionActionsProps {
  isFocused?: boolean
  onEdit: () => void
  onDelete: () => void
  disabled?: boolean
  isLoading?: boolean
}

/**
 * Action buttons for answer option images:
 * - Edit Image (always available)
 * - Delete Image (always available)
 */
export const ImageAnswerOptionActions: React.FC<
  ImageAnswerOptionActionsProps
> = ({ isFocused = false, onEdit, onDelete, disabled = false }) => {
  return (
    <div
      className={cn(
        'absolute bottom-0 inset-x-0 bg-black/70 opacity-0 group-hover/option:opacity-100 transition-opacity flex justify-center gap-1 p-1',
        { 'opacity-100': isFocused },
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onEdit}
        disabled={disabled}
        title="Edit Image"
        className="h-7 w-7 p-0 text-white hover:text-white hover:bg-white/20"
      >
        <Edit className="h-3 w-3" />
      </Button>
      <DialogConfirmClickable
        element={Button}
        title="Delete Image"
        message="Are you sure you want to delete this image? This cannot be undone."
        actionText="Delete"
        confirmAction={onDelete}
        variant="ghost"
        size="sm"
        disabled={disabled}
        className="h-7 w-7 p-0 text-white hover:text-white hover:bg-white/20"
        data-testid="image-delete-button"
      >
        <Trash2 className="h-3 w-3" />
      </DialogConfirmClickable>
    </div>
  )
}
