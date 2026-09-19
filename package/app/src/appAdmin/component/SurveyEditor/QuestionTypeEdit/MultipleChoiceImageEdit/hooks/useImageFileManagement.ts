import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import type { SurveyAnswerOption } from 'veysur-common'

import { getFileApi } from 'appAdmin/registry/getFileApi'
import {
  IMAGE_CONFIG,
  generateThumbnail,
  convertBlobToJpeg,
} from 'common/imageProcessing'
import { calculateFileHash } from 'common/uploadFile'

interface UseImageFileManagementProps {
  projectId: string
  surveyId: string
  jwtToken: string | undefined
  lang: string
  langDefault: string
  answerOption: SurveyAnswerOption
  onDeleteImage: () => void
  onUpdateImage: (imagePath: string, imageFileId: string) => void
}

interface UseImageFileManagementReturn {
  handleDeleteImage: () => Promise<void>
  handleEditImage: () => Promise<void>
  handleUndoEdits: () => Promise<void>
  showEditCropper: boolean
  editOriginalBlob: Blob | null
  handleEditCropComplete: (blob: Blob) => Promise<void>
  handleCancelEditCrop: () => void
  isFetchingOriginal: boolean
  isProcessingEdit: boolean
}

/**
 * Hook to manage image file operations using the image set overwrite pattern:
 * - Delete: removes all S3 objects for the image set
 * - Edit: fetch edited image, re-crop, overwrite edited+thumb at same S3 paths
 * - Undo: fetch original, overwrite edited+thumb at same S3 paths
 */
export function useImageFileManagement({
  projectId,
  surveyId,
  jwtToken,
  lang,
  langDefault,
  answerOption,
  onDeleteImage,
  onUpdateImage,
}: UseImageFileManagementProps): UseImageFileManagementReturn {
  const [showEditCropper, setShowEditCropper] = useState(false)
  const [editOriginalBlob, setEditOriginalBlob] = useState<Blob | null>(null)
  const [isFetchingOriginal, setIsFetchingOriginal] = useState(false)
  const [isProcessingEdit, setIsProcessingEdit] = useState(false)

  const handleDeleteImage = useCallback(async () => {
    const imageSetId = answerOption.getImageSetId(lang, langDefault)

    onDeleteImage()

    if (imageSetId && jwtToken) {
      await getFileApi()
        .deleteImageSet(projectId, jwtToken, imageSetId, {
          surveyId,
          fileContext: 'survey',
        })
        .catch(console.error)
    }
  }, [
    jwtToken,
    projectId,
    surveyId,
    lang,
    langDefault,
    answerOption,
    onDeleteImage,
  ])

  const handleEditImage = useCallback(async () => {
    if (!jwtToken) return

    setIsFetchingOriginal(true)

    try {
      const url =
        answerOption.getEditedUrl(lang, langDefault) ??
        answerOption.getOriginalUrl(lang, langDefault)
      if (!url) {
        toast.error('Image file not found')
        return
      }

      const response = await fetch(url)

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Image file not found on server')
        } else if (response.status === 403) {
          throw new Error('Access denied to image file')
        } else {
          throw new Error(`Failed to fetch file: ${response.statusText}`)
        }
      }

      const blob = await response.blob()
      setEditOriginalBlob(blob)
      setShowEditCropper(true)
    } catch (error) {
      console.error('Failed to load image file:', error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to load image',
      )
    } finally {
      setIsFetchingOriginal(false)
    }
  }, [jwtToken, lang, langDefault, answerOption])

  const handleEditCropComplete = useCallback(
    async (croppedBlob: Blob) => {
      if (!jwtToken || !editOriginalBlob) return

      setIsProcessingEdit(true)

      try {
        const fileApi = getFileApi()
        const uploadOptions = { surveyId, fileContext: 'survey' as const }

        const editedJpeg = await convertBlobToJpeg(croppedBlob)
        const newImageSetId = (
          await calculateFileHash(
            new File([editedJpeg], 'edited.jpg', { type: 'image/jpeg' }),
          )
        ).substring(0, 16)

        const {
          filePath: editedPath,
          fileId: editedFileId,
          existingFile: editedDeduped,
        } = await fileApi.uploadImageSetVariant(
          projectId,
          jwtToken,
          newImageSetId,
          'edited',
          editedJpeg,
          uploadOptions,
        )

        if (editedDeduped) {
          onUpdateImage(editedPath, editedFileId)
          toast.success('Image updated successfully')
          return
        }

        const thumbnailJpeg = await generateThumbnail(
          editedJpeg,
          IMAGE_CONFIG.MAX_THUMBNAIL_DIMENSION,
        )

        const originalUrl = answerOption.getOriginalUrl(lang, langDefault)
        if (!originalUrl) {
          throw new Error('Original image not found')
        }
        const originalResponse = await fetch(originalUrl)
        if (!originalResponse.ok) {
          throw new Error('Original image not found')
        }
        const originalBlob = await originalResponse.blob()
        const originalJpeg = await convertBlobToJpeg(originalBlob)

        await fileApi.uploadImageSetVariant(
          projectId,
          jwtToken,
          newImageSetId,
          'original',
          originalJpeg,
          uploadOptions,
        )

        await fileApi.uploadImageSetVariant(
          projectId,
          jwtToken,
          newImageSetId,
          'thumb',
          thumbnailJpeg,
          uploadOptions,
        )

        onUpdateImage(editedPath, editedFileId)
        toast.success('Image updated successfully')
      } catch (error) {
        console.error('Failed to update image:', error)
        toast.error('Failed to update image')
      } finally {
        setIsProcessingEdit(false)
        setShowEditCropper(false)
        setEditOriginalBlob(null)
      }
    },
    [
      jwtToken,
      editOriginalBlob,
      projectId,
      surveyId,
      lang,
      langDefault,
      answerOption,
      onUpdateImage,
    ],
  )

  const handleUndoEdits = useCallback(async () => {
    if (!jwtToken) return

    setIsProcessingEdit(true)

    try {
      const fileApi = getFileApi()
      const uploadOptions = { surveyId, fileContext: 'survey' as const }

      const originalUrl = answerOption.getOriginalUrl(lang, langDefault)
      if (!originalUrl) {
        toast.error('Original file not found')
        return
      }

      const response = await fetch(originalUrl)
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Original file not found on server')
        } else {
          throw new Error(`Failed to fetch file: ${response.statusText}`)
        }
      }
      const originalBlob = await response.blob()
      const editedJpeg = await convertBlobToJpeg(originalBlob)
      const newImageSetId = await calculateFileHash(
        new File([editedJpeg], 'edited.jpg', { type: 'image/jpeg' }),
      )

      const {
        filePath: editedPath,
        fileId: editedFileId,
        existingFile: editedDeduped,
      } = await fileApi.uploadImageSetVariant(
        projectId,
        jwtToken,
        newImageSetId,
        'edited',
        editedJpeg,
        uploadOptions,
      )

      if (editedDeduped) {
        onUpdateImage(editedPath, editedFileId)
        toast.success('Reverted to original image')
        return
      }

      const thumbnailJpeg = await generateThumbnail(
        editedJpeg,
        IMAGE_CONFIG.MAX_THUMBNAIL_DIMENSION,
      )

      await fileApi.uploadImageSetVariant(
        projectId,
        jwtToken,
        newImageSetId,
        'original',
        editedJpeg,
        uploadOptions,
      )

      await fileApi.uploadImageSetVariant(
        projectId,
        jwtToken,
        newImageSetId,
        'thumb',
        thumbnailJpeg,
        uploadOptions,
      )

      onUpdateImage(editedPath, editedFileId)
      toast.success('Reverted to original image')
    } catch (error) {
      console.error('Failed to undo edits:', error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to undo edits',
      )
    } finally {
      setIsProcessingEdit(false)
    }
  }, [
    jwtToken,
    projectId,
    surveyId,
    lang,
    langDefault,
    answerOption,
    onUpdateImage,
  ])

  const handleCancelEditCrop = useCallback(() => {
    setShowEditCropper(false)
    setEditOriginalBlob(null)
  }, [])

  return {
    handleDeleteImage,
    handleEditImage,
    handleUndoEdits,
    showEditCropper,
    editOriginalBlob,
    handleEditCropComplete,
    handleCancelEditCrop,
    isFetchingOriginal,
    isProcessingEdit,
  }
}
