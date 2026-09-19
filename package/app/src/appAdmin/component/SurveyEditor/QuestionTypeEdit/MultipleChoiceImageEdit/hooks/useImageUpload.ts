import { useState, useCallback } from 'react'
import { toast } from 'sonner'

import {
  IMAGE_CONFIG,
  resizeImage,
  generateThumbnail,
  convertBlobToJpeg,
} from 'common/imageProcessing'
import { calculateFileHash } from 'common/uploadFile'
import { getFileApi } from 'appAdmin/registry/getFileApi'

interface UseImageUploadProps {
  projectId: string
  surveyId: string
  jwtToken: string | undefined
  onUploadComplete: (imagePath: string, imageFileId: string) => void
}

interface UseImageUploadReturn {
  isUploading: boolean
  uploadProgress: number
  showCropper: boolean
  selectedFile: File | null
  processedOriginal: Blob | null
  handleFileSelect: (file: File) => Promise<void>
  handleCropComplete: (croppedBlob: Blob) => Promise<void>
  handleCancelCrop: () => void
}

/**
 * Hook to manage image upload workflow:
 * 1. Resize original to 1080px
 * 2. Open cropper
 * 3. Convert all blobs to JPEG, generate thumbnail
 * 4. Upload all 3 variants to predetermined S3 paths under a shared imageSetId
 * 5. Call onUploadComplete with the edited image path
 */
export function useImageUpload({
  projectId,
  surveyId,
  jwtToken,
  onUploadComplete,
}: UseImageUploadProps): UseImageUploadReturn {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showCropper, setShowCropper] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [processedOriginal, setProcessedOriginal] = useState<Blob | null>(null)

  const handleFileSelect = useCallback(async (file: File) => {
    try {
      setSelectedFile(file)
      const resized = await resizeImage(
        file,
        IMAGE_CONFIG.MAX_ORIGINAL_DIMENSION,
      )
      setProcessedOriginal(resized)
      setShowCropper(true)
    } catch (error) {
      console.error('Failed to process image:', error)
      toast.error('Failed to process image')
    }
  }, [])

  const handleCropComplete = useCallback(
    async (croppedBlob: Blob) => {
      if (!processedOriginal || !selectedFile || !jwtToken) return

      setIsUploading(true)
      setUploadProgress(0)

      try {
        const fileApi = getFileApi()

        const editedJpeg = await convertBlobToJpeg(croppedBlob)
        const imageSetId = (
          await calculateFileHash(
            new File([editedJpeg], 'edited.jpg', { type: 'image/jpeg' }),
          )
        ).substring(0, 16)

        const uploadOptions = {
          surveyId,
          fileContext: 'survey' as const,
          onProgress: ({ percentage }: { percentage: number }) => {
            setUploadProgress(percentage)
          },
        }

        const {
          filePath: editedPath,
          fileId: editedFileId,
          existingFile: editedDeduped,
        } = await fileApi.uploadImageSetVariant(
          projectId,
          jwtToken,
          imageSetId,
          'edited',
          editedJpeg,
          uploadOptions,
        )

        if (editedDeduped) {
          onUploadComplete(editedPath, editedFileId)
          toast.success('Image uploaded successfully')
          return
        }

        const originalJpeg = await convertBlobToJpeg(processedOriginal)
        const thumbnailJpeg = await generateThumbnail(
          editedJpeg,
          IMAGE_CONFIG.MAX_THUMBNAIL_DIMENSION,
        )

        await fileApi.uploadImageSetVariant(
          projectId,
          jwtToken,
          imageSetId,
          'original',
          originalJpeg,
          uploadOptions,
        )

        await fileApi.uploadImageSetVariant(
          projectId,
          jwtToken,
          imageSetId,
          'thumb',
          thumbnailJpeg,
          uploadOptions,
        )

        onUploadComplete(editedPath, editedFileId)
        toast.success('Image uploaded successfully')
      } catch (error) {
        console.error('Upload failed:', error)
        toast.error('Failed to upload image')
      } finally {
        setIsUploading(false)
        setUploadProgress(0)
        setShowCropper(false)
        setSelectedFile(null)
        setProcessedOriginal(null)
      }
    },
    [
      processedOriginal,
      selectedFile,
      jwtToken,
      surveyId,
      projectId,
      onUploadComplete,
    ],
  )

  const handleCancelCrop = useCallback(() => {
    setShowCropper(false)
    setSelectedFile(null)
    setProcessedOriginal(null)
  }, [])

  return {
    isUploading,
    uploadProgress,
    showCropper,
    selectedFile,
    processedOriginal,
    handleFileSelect,
    handleCropComplete,
    handleCancelCrop,
  }
}
