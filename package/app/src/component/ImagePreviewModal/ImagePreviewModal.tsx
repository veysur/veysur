import React from 'react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from 'component/shadcn/dialog'

interface ImagePreviewModalProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  title?: string
  alt?: string
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title = 'Image preview',
  alt = 'Image preview',
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 p-4 flex items-center justify-center overflow-hidden">
          <img
            src={imageUrl}
            alt={alt}
            className="max-w-full max-h-[75vh] object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
