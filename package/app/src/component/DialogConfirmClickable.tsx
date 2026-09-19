import React, { useState } from 'react'

import { Button } from 'component/shadcn/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from 'component/shadcn/dialog'

import { useActionMenu } from './ActionMenu'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  comment?: string
  actionText: string
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
}

/**
 * Controlled confirm dialog with no trigger of its own — the caller owns
 * `open` state and decides when to show it. `DialogConfirmClickable` renders
 * this internally behind a click-triggered button; other flows (e.g.
 * structural-change guards) can render it directly.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  comment,
  actionText,
  onConfirm,
  onOpenChange,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
    <DialogContent
      data-testid="confirm-dialog"
      onCloseAutoFocus={(e) => e.preventDefault()}
    >
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <DialogBody>
        <DialogDescription>
          {message}{' '}
          {comment && (
            <span className="text-sm mt-2 muted block">{comment}</span>
          )}
        </DialogDescription>
      </DialogBody>
      <DialogFooter>
        <Button
          variant="secondary"
          data-testid="confirm-dialog-cancel"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          data-testid="confirm-dialog-confirm"
          onClick={onConfirm}
        >
          {actionText}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)

interface Props {
  as?: React.ElementType
  title: string
  message: string
  comment?: string
  actionText: string
  confirmAction: () => void
  children?: React.ReactNode
  [key: string]: unknown
}

export const DialogConfirmClickable: React.FC<Props> = (props) => {
  const {
    as: AsComponent,
    title,
    message,
    comment,
    actionText,
    confirmAction,
    children,
  } = props

  const [show, setShow] = useState(false)
  const actionMenu = useActionMenu()

  const handleClose = () => {
    setShow(false)
    // Close the parent dropdown menu if it exists
    if (actionMenu) {
      // Small delay to let dialog close animation start
      setTimeout(() => {
        actionMenu.closeMenu()
      }, 50)
    }
  }

  const handleShow = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShow(true)
  }

  const handleConfirm = () => {
    confirmAction()
    handleClose()
  }

  const handleOpenChange = (show: boolean) => {
    if (!show) {
      handleClose()
    }
    setShow(show)
  }

  const elementProps: Record<string, unknown> = { ...props }
  delete elementProps.element
  delete elementProps.title
  delete elementProps.message
  delete elementProps.actionText
  delete elementProps.confirmAction
  delete elementProps.children
  delete elementProps.comment

  return (
    <>
      {AsComponent ? (
        <AsComponent as="button" {...elementProps} onClick={handleShow}>
          {children}
        </AsComponent>
      ) : (
        <Button
          {...elementProps}
          onClick={handleShow}
          style={{
            ...(elementProps.style as React.CSSProperties | undefined),
          }}
        >
          {children}
        </Button>
      )}

      <ConfirmDialog
        open={show}
        title={title}
        message={message}
        comment={comment}
        actionText={actionText}
        onConfirm={handleConfirm}
        onOpenChange={handleOpenChange}
      />
    </>
  )
}

export default DialogConfirmClickable
