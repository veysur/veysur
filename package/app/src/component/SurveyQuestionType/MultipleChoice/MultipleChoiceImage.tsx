import React, { useCallback, useMemo, useState } from 'react'
import { Check, MessageSquarePlus, ZoomIn } from 'lucide-react'
import {
  CHOICE_OTHER_CODE,
  CHOICE_OTHER_VALUE_KEY,
  MinMax,
  SurveyAnswerOption,
} from 'veysur-common'

import { cn } from 'common/cn'
import { Input } from 'component/shadcn/input'
import { Button } from 'component/shadcn/button'
import { ImagePreviewModal } from 'component/ImagePreviewModal/ImagePreviewModal'
import { QuestionTypeProps } from '../QuestionTypeProps'

interface ImageOptionCardProps {
  option: SurveyAnswerOption
  isSelected: boolean
  lang: string
  langDefault: string
  onClick: () => void
}

const ImageOptionCard: React.FC<ImageOptionCardProps> = ({
  option,
  isSelected,
  lang,
  langDefault,
  onClick,
}) => {
  const [showPreview, setShowPreview] = useState(false)
  const thumbnailUrl = option.getThumbnailUrl(lang, langDefault)
  const label = option.label?.getLang(lang, langDefault)
  const previewUrl =
    option.getEditedUrl(lang, langDefault) ?? thumbnailUrl ?? ''

  return (
    <>
      <div className="flex flex-col cursor-pointer" onClick={onClick}>
        {/* Bordered image card */}
        <div
          className={cn(
            'group relative rounded border-2 overflow-hidden aspect-[4/3] bg-gray-200 dark:bg-gray-950 transition-all',
            {
              'border-primary shadow-md': isSelected,
              'border-border hover:border-primary/50 hover:shadow-sm':
                !isSelected,
            },
          )}
        >
          {/* Top-left: check indicator when selected */}
          {isSelected && (
            <div className="absolute top-2 left-2 z-10 h-6 w-6 rounded-full bg-primary border-2 border-primary flex items-center justify-center">
              <Check className="h-4 w-4 text-primary-foreground" />
            </div>
          )}

          {/* Top-right: magnifier on hover, or empty circle placeholder when no image */}
          {thumbnailUrl ? (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="absolute top-2 right-2 z-10"
              title="View full size"
              onClick={(e) => {
                e.stopPropagation()
                setShowPreview(true)
              }}
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <div className="absolute top-2 right-2 z-10 h-6 w-6 rounded-full border-2 bg-background/80 border-border" />
          )}

          {/* Image area */}
          <div className="w-full h-full">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={label || 'Answer option'}
                className="w-full h-full object-scale-down"
                data-testid="answer-option-thumbnail"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gray-200 dark:bg-gray-950 flex items-center justify-center">
                <span className="text-xs text-muted-foreground">No image</span>
              </div>
            )}
          </div>
        </div>

        {/* Label — outside/below the bordered card */}
        {label && (
          <p className="pt-1 text-sm text-center line-clamp-2">{label}</p>
        )}
      </div>

      {thumbnailUrl && (
        <ImagePreviewModal
          title={label}
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          imageUrl={previewUrl}
        />
      )}
    </>
  )
}

interface OtherOptionCardProps {
  isSelected: boolean
  onClick: () => void
}

const OtherOptionCard: React.FC<OtherOptionCardProps> = ({
  isSelected,
  onClick,
}) => (
  <div className="flex flex-col cursor-pointer" onClick={onClick}>
    <div
      className={cn(
        'relative rounded border-2 overflow-hidden aspect-[4/3] transition-all flex items-center justify-center',
        {
          'border-primary shadow-md bg-primary/5': isSelected,
          'border-border hover:border-primary/50 hover:shadow-sm bg-gray-200 dark:bg-gray-950':
            !isSelected,
        },
      )}
    >
      {isSelected && (
        <div className="absolute top-2 left-2 z-10 h-6 w-6 rounded-full bg-primary border-2 border-primary flex items-center justify-center">
          <Check className="h-4 w-4 text-primary-foreground" />
        </div>
      )}
      <div className="flex flex-col items-center gap-1 text-muted-foreground">
        <MessageSquarePlus className="h-6 w-6" />
      </div>
    </div>
    <p className="pt-1 text-sm text-center">Other</p>
  </div>
)

export const MultipleChoiceImage: React.FC<QuestionTypeProps> = ({
  question,
  value = {},
  lang,
  langDefault,
  onChange,
}) => {
  const answerOptions = question?.answerOptions || []

  // Determine if this is radio (single) or checkbox (multiple) based on choiceMinMax
  const chooseMinMax = (question?.attributes?.choiceMinMax as
    Partial<MinMax> | undefined) || { min: 0, max: 1 }
  const isRadio = (chooseMinMax.min ?? 0) <= 1 && chooseMinMax.max === 1

  // Ensure value is an object (not array)
  const currentValue = useMemo(() => {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? value
      : {}
  }, [value])

  const hasOther = Boolean(question?.attributes?.choiceOther)
  const isOtherSelected = currentValue[CHOICE_OTHER_CODE] === true
  const otherValue =
    typeof currentValue[CHOICE_OTHER_VALUE_KEY] === 'string'
      ? currentValue[CHOICE_OTHER_VALUE_KEY]
      : ''

  const handleOptionClick = useCallback(
    (optionCode: string) => {
      if (!onChange) return

      if (isRadio) {
        // Radio: set single selection, clearing all previous choices including OTHER/OTHER_VALUE
        onChange({ [optionCode]: true })
      } else {
        const isSelected = currentValue[optionCode] === true
        if (isSelected) {
          const next = { ...currentValue }
          delete next[optionCode]
          if (optionCode === CHOICE_OTHER_CODE)
            delete next[CHOICE_OTHER_VALUE_KEY]
          onChange(next)
        } else {
          onChange({ ...currentValue, [optionCode]: true })
        }
      }
    },
    [isRadio, currentValue, onChange],
  )

  const handleOtherTextChange = useCallback(
    (text: string) => {
      if (!onChange) return
      onChange({ ...currentValue, [CHOICE_OTHER_VALUE_KEY]: text })
    },
    [currentValue, onChange],
  )

  const cols = question?.attributes?.columns ?? 1
  const colsClass =
    { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3' }[
      cols as 1 | 2 | 3
    ] ?? 'grid-cols-1'

  return (
    <div className="flex flex-col gap-1">
      <div className={cn('grid gap-3', colsClass)}>
        {answerOptions.map((option) => (
          <ImageOptionCard
            key={option.code}
            option={option}
            isSelected={currentValue[option.code] === true}
            lang={lang}
            langDefault={langDefault}
            onClick={() => handleOptionClick(option.code)}
          />
        ))}
        {hasOther && (
          <OtherOptionCard
            isSelected={isOtherSelected}
            onClick={() => handleOptionClick(CHOICE_OTHER_CODE)}
          />
        )}
      </div>
      {hasOther && isOtherSelected && (
        <Input
          className="mt-1"
          placeholder="Please specify"
          value={otherValue}
          onChange={(e) => handleOtherTextChange(e.target.value)}
        />
      )}
    </div>
  )
}
