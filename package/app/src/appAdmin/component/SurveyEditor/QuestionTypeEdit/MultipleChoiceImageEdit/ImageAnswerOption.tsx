import React, { useCallback, useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, ZoomIn } from 'lucide-react'
import type { SurveyAnswerOption } from 'veysur-common'

import { cn } from 'common/cn'
import { stripHtml } from 'common/stripHtml'
import { Button } from 'component/shadcn/button'
import { DialogConfirmClickable } from 'component/DialogConfirmClickable'
import { ImagePreviewModal } from 'component/ImagePreviewModal/ImagePreviewModal'
import { ContentEditor } from 'appAdmin/component/ContentEditor'
import {
  useSurveyEditorStore,
  useSurveyEditorFocus,
  SURVEY_ENTITY_TYPE_ANSWER_OPTION,
} from 'appAdmin/component/SurveyEditor'
import { MoveNav } from 'appAdmin/component/SurveyEditor/MoveNav'
import { FieldError } from 'component/Form'

import { ImageUploadSection } from './ImageUploadSection'

interface ImageAnswerOptionProps {
  answerOption: SurveyAnswerOption
  questionId: string
  questionCode: string
  surveyId: string
  projectId: string
  jwtToken: string | undefined
  lang: string
  langDefault: string
  langEditing: string
  validationErrors?: string[]
  index: number
  totalCount: number
  onUpdateImage: (
    questionId: string,
    answerOptionId: string,
    imageData: { imagePath: string | null; imageFileId: string | null },
  ) => void
  onUpdateLabel: (
    questionId: string,
    answerOptionId: string,
    text: string,
    lang: string,
  ) => void
  onDelete: (questionId: string, answerOptionId: string) => void
}

/**
 * Individual answer option row for image-based multiple choice questions.
 * Handles:
 * - Drag and drop
 * - Focus management
 * - Image upload/display
 * - Deletion with cascade
 */
export const ImageAnswerOption: React.FC<ImageAnswerOptionProps> = React.memo(
  ({
    answerOption,
    questionId,
    surveyId,
    projectId,
    jwtToken,
    lang,
    langDefault,
    langEditing,
    validationErrors,
    index,
    totalCount,
    onUpdateImage,
    onUpdateLabel,
    onDelete,
  }) => {
    const { surveyFocus, setSurveyFocus } = useSurveyEditorFocus()
    const moveAnswerOption = useSurveyEditorStore(
      (state) => state.operations?.moveAnswerOption,
    )
    const langDefaultFull = useSurveyEditorStore((state) => state.langDefault)

    // Sortable drag and drop
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: answerOption._id })

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    }

    const isFocused = React.useMemo(
      () =>
        surveyFocus?.entityType === SURVEY_ENTITY_TYPE_ANSWER_OPTION &&
        surveyFocus?.id === answerOption._id &&
        surveyFocus?.parentId === questionId,
      [surveyFocus, answerOption._id, questionId],
    )

    const [showPreview, setShowPreview] = useState(false)

    const hasLangSpecificImage = answerOption.hasImage(lang)
    const previewUrl = answerOption.getEditedUrl(langEditing, langDefault) ?? ''

    const handleFocus = useCallback(
      (e?: React.MouseEvent) => {
        e?.stopPropagation()
        setSurveyFocus({
          entityType: SURVEY_ENTITY_TYPE_ANSWER_OPTION,
          id: answerOption._id,
          parentId: questionId,
        })
      },
      [setSurveyFocus, answerOption._id, questionId],
    )

    const handleLabelChange = useCallback(
      (text: string) => {
        onUpdateLabel(questionId, answerOption._id, text, langEditing)
      },
      [onUpdateLabel, questionId, answerOption._id, langEditing],
    )

    const handleUpdateImage = useCallback(
      (imagePath: string, imageFileId: string) => {
        onUpdateImage(questionId, answerOption._id, {
          imagePath,
          imageFileId,
        })
      },
      [onUpdateImage, questionId, answerOption._id],
    )

    const handleDeleteImage = useCallback(() => {
      onUpdateImage(questionId, answerOption._id, {
        imagePath: null,
        imageFileId: null,
      })
    }, [onUpdateImage, questionId, answerOption._id])

    const handleDelete = useCallback(() => {
      onDelete(questionId, answerOption._id)
    }, [onDelete, questionId, answerOption._id])

    const handleMoveUp = useCallback(
      () => moveAnswerOption?.(questionId, answerOption._id, index - 1),
      [moveAnswerOption, questionId, answerOption._id, index],
    )

    const handleMoveDown = useCallback(
      () => moveAnswerOption?.(questionId, answerOption._id, index + 1),
      [moveAnswerOption, questionId, answerOption._id, index],
    )

    return (
      <>
        <div
          ref={setNodeRef}
          style={style}
          className="flex flex-col group/option"
          onClick={handleFocus}
        >
          {/* Image box — bordered, contains drag handle, delete button, and image */}
          <div
            className={cn(
              'relative rounded border overflow-hidden aspect-[4/3] transition-colors cursor-pointer',
              {
                'ring-2 ring-yellow-500': isFocused,
              },
            )}
          >
            {/* Drag handle — top-left overlay */}
            <div
              {...listeners}
              {...attributes}
              className={cn(
                'drag-handle absolute top-3 left-3 z-10 text-white',
              )}
            >
              <Button variant="link" className="p-0">
                <GripVertical className="h-4 w-4" />
              </Button>
            </div>

            {/* Top-right overlay */}
            <div
              className={cn(
                'absolute top-3 right-3 z-10 group-hover/option:opacity-100 transition-opacity',
              )}
            >
              {hasLangSpecificImage ? (
                <Button
                  variant="link"
                  className="p-0"
                  title="Preview image"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowPreview(true)
                  }}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              ) : (
                <DialogConfirmClickable
                  element={Button}
                  title="Delete Answer Option"
                  message="Are you sure you want to delete this answer option? This cannot be undone."
                  actionText="Delete"
                  confirmAction={handleDelete}
                  variant="link-destructive"
                  size="sm"
                  className="delete"
                >
                  <Trash2 className="h-4 w-4" />
                </DialogConfirmClickable>
              )}
            </div>

            {/* Image area */}
            <ImageUploadSection
              answerOption={answerOption}
              projectId={projectId}
              surveyId={surveyId}
              jwtToken={jwtToken}
              lang={langEditing}
              langDefault={langDefault}
              onUpdateImage={handleUpdateImage}
              onDeleteImage={handleDeleteImage}
              isFocused={isFocused}
            />
          </div>

          <div className="pt-1 text-sm">
            <ContentEditor
              value={answerOption.label.getLang(lang, langDefault)}
              variant="inline"
              placeholder={
                stripHtml(answerOption.label.getLang(langDefaultFull)) ||
                'Label'
              }
              withToolbar={false}
              onChange={handleLabelChange}
            />
            <FieldError errors={validationErrors} />
          </div>
          <MoveNav
            layout="inline"
            className={cn(
              'mt-1 flex',
              isFocused
                ? ''
                : 'invisible pointer-events-none group-hover/option:visible group-hover/option:pointer-events-auto',
            )}
            onMoveUp={index === 0 ? undefined : handleMoveUp}
            onMoveDown={index === totalCount - 1 ? undefined : handleMoveDown}
            itemType="answer option"
          />
        </div>

        {hasLangSpecificImage && previewUrl && (
          <ImagePreviewModal
            isOpen={showPreview}
            onClose={() => setShowPreview(false)}
            imageUrl={previewUrl}
          />
        )}
      </>
    )
  },
  (prev, next) => {
    return (
      prev.answerOption._id === next.answerOption._id &&
      prev.answerOption === next.answerOption &&
      prev.lang === next.lang &&
      prev.langDefault === next.langDefault &&
      prev.langEditing === next.langEditing &&
      prev.validationErrors === next.validationErrors &&
      prev.index === next.index &&
      prev.totalCount === next.totalCount
    )
  },
)

ImageAnswerOption.displayName = 'ImageAnswerOption'
