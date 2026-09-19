import React, { useState } from 'react'
import { Check } from 'lucide-react'

import { cn } from 'common/cn'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from 'component/shadcn/dialog'
import { Button } from 'component/shadcn/button'
import { Label } from 'component/shadcn/label'
import {
  contentTypeOptions,
  ContentTypeOptionConfig,
} from '../SurveyAttribute/contentAttributeConfig'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (config: { type: string }) => void
  initialType?: string
}

type ContentTypeCardProps = {
  config: ContentTypeOptionConfig
  isSelected: boolean
  onSelect: () => void
}

const ContentTypeCard: React.FC<ContentTypeCardProps> = ({
  config,
  isSelected,
  onSelect,
}) => {
  const Icon = config.icon
  return (
    <button
      type="button"
      onClick={onSelect}
      data-testid={`content-type-option-${config.type}`}
      className={cn(
        'relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
        'hover:border-primary/50 hover:shadow-md',
        isSelected ? 'border-primary bg-primary/5 shadow-md' : 'border-border',
      )}
    >
      <Icon
        className={cn(
          'h-8 w-8',
          isSelected ? 'text-primary' : 'text-muted-foreground',
        )}
      />
      <span className="text-sm font-medium">{config.label}</span>
      {isSelected && (
        <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="h-3 w-3 text-primary-foreground" />
        </div>
      )}
    </button>
  )
}

/**
 * Single-step content-type picker. The parent remounts this via
 * `key={open ? 'open' : 'closed'}`, so the initial selection only needs to be
 * computed once per mount. Unlike `QuestionTypeModal` there are no categories
 * or type-specific attribute steps.
 */
export const ContentTypeModal: React.FC<Props> = ({
  open,
  onOpenChange,
  onConfirm,
  initialType,
}) => {
  const [selectedType, setSelectedType] = useState<string | null>(
    () => initialType ?? null,
  )

  const handleConfirm = () => {
    if (!selectedType) return
    onConfirm({ type: selectedType })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {initialType ? 'Change content type' : 'Add content'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Select a content type
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <Label className="text-sm font-medium">Select content type</Label>
          <div className="grid grid-cols-2 gap-3">
            {contentTypeOptions.map((option) => (
              <ContentTypeCard
                key={option.type}
                config={option}
                isSelected={selectedType === option.type}
                onSelect={() => setSelectedType(option.type)}
              />
            ))}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedType}
            data-testid="content-type-confirm"
          >
            {initialType ? 'Change type' : 'Add content'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
