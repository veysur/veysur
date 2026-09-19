import React, { useState, ReactNode } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from 'component/shadcn/dialog'

type Props = {
  title: string
  children?: ReactNode
  show?: boolean
  onClose?: () => void
}

export const SourceEditorModal: React.FC<Props> = (props) => {
  const { title, children, show: initShow = true, onClose = () => {} } = props

  const [show, setShow] = useState(initShow)

  const handleClose = () => {
    setShow(false)
    onClose()
  }

  return (
    <Dialog open={show} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="w-4/5 max-w-5xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">
            Edit the content&apos;s raw source
          </DialogDescription>
        </DialogHeader>
        <div>{children}</div>
      </DialogContent>
    </Dialog>
  )
}

export default SourceEditorModal
