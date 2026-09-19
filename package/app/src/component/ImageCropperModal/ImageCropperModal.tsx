import React, { useRef, useState, useCallback } from 'react'
import {
  Cropper,
  CropperRef,
  CropperState,
  ImageRestriction,
} from 'react-advanced-cropper'
import { RotateCw, RotateCcw, Undo } from 'lucide-react'
import 'react-advanced-cropper/dist/style.css'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from 'component/shadcn/dialog'
import { Button } from 'component/shadcn/button'

export interface ImageCropperModalProps {
  isOpen: boolean
  onClose: () => void
  imageFile: File | Blob
  onCropComplete: (croppedBlob: Blob) => void
  onCancel: () => void
  title?: string
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  onClose,
  imageFile,
  onCropComplete,
  onCancel,
  title = 'Crop Image',
}) => {
  const cropperRef = useRef<CropperRef>(null)
  const [imageUrl, setImageUrl] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [resetKey, setResetKey] = useState(0)

  // Initialize crop area to cover 100% of the image
  const defaultCoordinates = useCallback((state: CropperState) => {
    return {
      left: 0,
      top: 0,
      width: state.imageSize.width,
      height: state.imageSize.height,
    }
  }, [])

  // Load image URL when file changes
  React.useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile)
      setImageUrl(url)
      return () => {
        URL.revokeObjectURL(url)
      }
    }
  }, [imageFile])

  const handleRotateRight = useCallback(() => {
    if (cropperRef.current) {
      cropperRef.current.rotateImage(90)
      setHasChanges(true)
    }
  }, [])

  const handleRotateLeft = useCallback(() => {
    if (cropperRef.current) {
      cropperRef.current.rotateImage(-90)
      setHasChanges(true)
    }
  }, [])

  const handleUndoChanges = useCallback(() => {
    // Force cropper to remount with original state by changing key
    setResetKey((prev) => prev + 1)
    setHasChanges(false)
  }, [])

  const handleCropChange = useCallback(() => {
    setHasChanges(true)
  }, [])

  const handleApply = useCallback(async () => {
    if (!cropperRef.current) return

    setIsProcessing(true)

    try {
      const canvas = cropperRef.current.getCanvas()
      if (!canvas) {
        throw new Error('Failed to get cropped canvas')
      }

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Failed to create blob from canvas'))
            }
          },
          imageFile.type || 'image/jpeg',
          1,
        )
      })

      onCropComplete(blob)
      onClose()
    } catch (error) {
      console.error('Failed to process cropped image:', error)
      // You could show a toast error here
    } finally {
      setIsProcessing(false)
    }
  }, [imageFile, onCropComplete, onClose])

  const handleCancel = useCallback(() => {
    onCancel()
    onClose()
  }, [onCancel, onClose])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Adjust the crop area and rotate if needed. Click Apply when done.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col">
          <div className="mb-1 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRotateLeft}
              disabled={isProcessing}
              title="Rotate Left 90°"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <div>
              {hasChanges && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUndoChanges}
                  disabled={isProcessing}
                  title="Undo changes"
                >
                  <Undo className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRotateRight}
              disabled={isProcessing}
              title="Rotate Right 90°"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative h-[60vh] w-full border rounded-md overflow-hidden bg-muted">
            {imageUrl && (
              <Cropper
                key={`${imageUrl}-${resetKey}`}
                ref={cropperRef}
                src={imageUrl}
                className="h-full w-full"
                imageRestriction={ImageRestriction.fitArea}
                defaultCoordinates={defaultCoordinates}
                onChange={handleCropChange}
                stencilProps={{
                  movable: true,
                  resizable: true,
                  aspectRatio: undefined,
                  grid: true,
                }}
              />
            )}
          </div>
        </div>

        <DialogFooter className="mt-4 flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleApply}
              disabled={isProcessing}
              data-testid="crop-confirm-button"
            >
              {isProcessing ? 'Processing...' : 'Apply'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
