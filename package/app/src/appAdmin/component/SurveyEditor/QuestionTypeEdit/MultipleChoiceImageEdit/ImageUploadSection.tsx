import React from 'react'
import type { SurveyAnswerOption } from 'veysur-common'

import { ImageUploadDropZone } from 'component/ImageUploadDropZone/ImageUploadDropZone'
import { ImageCropperModal } from 'component/ImageCropperModal/ImageCropperModal'

import { ImageAnswerOptionActions } from './ImageAnswerOptionActions'
import { useImageUpload } from './hooks/useImageUpload'
import { useImageFileManagement } from './hooks/useImageFileManagement'

interface ImageUploadSectionProps {
  answerOption: SurveyAnswerOption
  projectId: string
  surveyId: string
  jwtToken: string | undefined
  lang: string
  langDefault: string
  onUpdateImage: (imagePath: string, imageFileId: string) => void
  onDeleteImage: () => void
  isFocused?: boolean
}

/**
 * Handles the image upload/display UI for an answer option:
 * - Shows upload dropzone if no image
 * - Shows thumbnail with action buttons if image exists
 * - Manages cropper modal
 */
export const ImageUploadSection: React.FC<ImageUploadSectionProps> = ({
  answerOption,
  projectId,
  surveyId,
  jwtToken,
  lang,
  langDefault,
  onUpdateImage,
  onDeleteImage,
  isFocused,
}) => {
  const {
    isUploading,
    uploadProgress,
    showCropper,
    selectedFile,
    processedOriginal,
    handleFileSelect,
    handleCropComplete,
    handleCancelCrop,
  } = useImageUpload({
    projectId,
    surveyId,
    jwtToken,
    onUploadComplete: onUpdateImage,
  })

  const {
    handleDeleteImage,
    handleEditImage,
    showEditCropper,
    editOriginalBlob,
    handleEditCropComplete,
    handleCancelEditCrop,
    isFetchingOriginal,
    isProcessingEdit,
  } = useImageFileManagement({
    projectId,
    surveyId,
    jwtToken,
    lang,
    langDefault,
    answerOption,
    onDeleteImage,
    onUpdateImage,
  })

  const thumbnailUrl = answerOption.getThumbnailUrl(lang, langDefault)
  const hasLangSpecificImage = answerOption.hasImage(lang)

  // Disable all actions during any processing
  const isAnyOperationInProgress =
    isUploading || isFetchingOriginal || isProcessingEdit

  return (
    <>
      {hasLangSpecificImage ? (
        <div className="w-full h-full relative overflow-hidden bg-gray-200 dark:bg-gray-950">
          <img
            src={thumbnailUrl!}
            alt="Answer option"
            className="w-full h-full object-scale-down"
            data-testid="answer-option-thumbnail"
          />
          <ImageAnswerOptionActions
            isFocused={isFocused}
            onEdit={handleEditImage}
            onDelete={handleDeleteImage}
            disabled={isAnyOperationInProgress}
            isLoading={isFetchingOriginal || isProcessingEdit}
          />
        </div>
      ) : (
        <ImageUploadDropZone
          onFileSelect={handleFileSelect}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          disabled={isAnyOperationInProgress}
          compact
        />
      )}

      {/* Upload cropper */}
      {showCropper && selectedFile && processedOriginal && (
        <ImageCropperModal
          isOpen={showCropper}
          onClose={() => handleCancelCrop()}
          imageFile={processedOriginal}
          onCropComplete={handleCropComplete}
          onCancel={handleCancelCrop}
          title="Crop Answer Option Image"
        />
      )}

      {/* Edit cropper */}
      {showEditCropper && editOriginalBlob && (
        <ImageCropperModal
          isOpen={showEditCropper}
          onClose={handleCancelEditCrop}
          imageFile={editOriginalBlob}
          onCropComplete={handleEditCropComplete}
          onCancel={handleCancelEditCrop}
          title="Edit Image"
        />
      )}
    </>
  )
}
