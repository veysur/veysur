import React, { useState } from 'react'
import { Check, ChevronRight, Pencil } from 'lucide-react'
import {
  getMatrixTypeConfig,
  SurveyAttributes,
  SurveyEntity,
} from 'veysur-common'

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
import { RadioGroup, RadioGroupItem } from 'component/shadcn/radio-group'
import { Label } from 'component/shadcn/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from 'component/shadcn/alert-dialog'

import {
  questionAttributesConfig,
  questionTypeOptions,
  questionCategories,
  QuestionTypeOptionConfig,
  QuestionCategoryConfig,
  QuestionAttributeOption,
  QuestionAttributeConfig,
} from '../SurveyAttribute/questionAttributeConfig'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (config: { type: string; attributes?: SurveyAttributes }) => void
  initialType?: string
  entity?: SurveyEntity
}

type QuestionTypeCardProps = {
  config: QuestionTypeOptionConfig
  isSelected: boolean
  onSelect: () => void
}

const QuestionTypeCard: React.FC<QuestionTypeCardProps> = ({
  config,
  isSelected,
  onSelect,
}) => {
  const Icon = config.icon
  return (
    <button
      type="button"
      onClick={onSelect}
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

type CategoryCardProps = {
  config: QuestionCategoryConfig
  isSelected: boolean
  onSelect: () => void
}

const CategoryCard: React.FC<CategoryCardProps> = ({
  config,
  isSelected,
  onSelect,
}) => {
  const Icon = config.icon
  return (
    <button
      type="button"
      onClick={onSelect}
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
      <span className="text-xs text-muted-foreground">
        {config.description}
      </span>
      {isSelected ? (
        <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="h-3 w-3 text-primary-foreground" />
        </div>
      ) : (
        <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-muted flex items-center justify-center">
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        </div>
      )}
    </button>
  )
}

type AttributeOptionCardProps = {
  option: QuestionAttributeOption
  isSelected: boolean
  onSelect: () => void
}

const AttributeOptionCard: React.FC<AttributeOptionCardProps> = ({
  option,
  isSelected,
  onSelect,
}) => {
  const Icon = option.icon
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'relative flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all',
        'hover:border-primary/50 hover:shadow-md',
        isSelected ? 'border-primary bg-primary/5 shadow-md' : 'border-border',
      )}
    >
      {Icon && (
        <Icon
          className={cn(
            'h-6 w-6',
            isSelected ? 'text-primary' : 'text-muted-foreground',
          )}
        />
      )}
      <span className="text-xs font-medium">{option.label}</span>
      {isSelected && (
        <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="h-3 w-3 text-primary-foreground" />
        </div>
      )}
    </button>
  )
}

type SelectionSummaryProps = {
  label: string
  selectedLabel: string
  icon?: React.ComponentType<{ className?: string }>
  onEdit: () => void
}

const SelectionSummary: React.FC<SelectionSummaryProps> = ({
  label,
  selectedLabel,
  icon: Icon,
  onEdit,
}) => {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
      <div className="flex items-center gap-3">
        {Icon && <Icon className="h-5 w-5 text-primary" />}
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className="text-sm font-medium">{selectedLabel}</span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onEdit}
        className="h-8 px-2 text-muted-foreground hover:text-foreground"
      >
        <Pencil className="h-4 w-4 mr-1" />
        Change
      </Button>
    </div>
  )
}

function subquestionsWouldChange(
  entity: SurveyEntity | undefined,
  newType: string,
): boolean {
  const config = getMatrixTypeConfig(newType)
  if (!config) return false
  const subquestions =
    entity && 'subquestions' in entity ? (entity.subquestions ?? []) : []
  return subquestions.some(
    (sq: { type: string }) => sq.type !== config.defaultSubquestionType,
  )
}

export const QuestionTypeModal: React.FC<Props> = ({
  open,
  onOpenChange,
  onConfirm,
  initialType,
  entity,
}) => {
  // The parent remounts this component via `key={open}` on open/close, so
  // this initial state only needs to be computed once per mount rather than
  // reset in an effect keyed on `open`.
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    () =>
      (initialType &&
        (questionTypeOptions.find((t) => t.type === initialType)?.category ??
          null)) ||
      null,
  )
  const [selectedType, setSelectedType] = useState<string | null>(
    () => initialType ?? null,
  )
  const [attributeSelections, setAttributeSelections] = useState<
    Record<string, string>
  >({})
  const [editingStep, setEditingStep] = useState<string>(() =>
    initialType ? 'type' : 'category',
  )
  const [showAlert, setShowAlert] = useState(false)

  const visibleAttributes = questionAttributesConfig.filter((config) => {
    if (!selectedType || !config.questionTypes.includes(selectedType)) {
      return false
    }
    return true
  })

  const selectedTypeConfig = questionTypeOptions.find(
    (c) => c.type === selectedType,
  )

  const typesInCategory = questionTypeOptions.filter(
    (c) => c.category === selectedCategory,
  )

  const ungroupedTypesInCategory = typesInCategory.filter((c) => !c.subcategory)
  const subcategoryGroups = typesInCategory.reduce<
    Record<string, QuestionTypeOptionConfig[]>
  >((groups, card) => {
    if (!card.subcategory) return groups
    groups[card.subcategory] = [...(groups[card.subcategory] || []), card]
    return groups
  }, {})

  const getCurrentAttributeIndex = () => {
    if (editingStep === 'type') return -1
    return visibleAttributes.findIndex((a) => a.attributeId === editingStep)
  }

  const getSelectedOptionLabel = (attrConfig: QuestionAttributeConfig) => {
    const selectedValue =
      attributeSelections[attrConfig.attributeId] || attrConfig.defaultOption
    const option = attrConfig.options.find((o) => o.value === selectedValue)
    return option?.label || ''
  }

  const getSelectedOptionIcon = (attrConfig: QuestionAttributeConfig) => {
    const selectedValue =
      attributeSelections[attrConfig.attributeId] || attrConfig.defaultOption
    const option = attrConfig.options.find((o) => o.value === selectedValue)
    return option?.icon
  }

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId)
    setSelectedType(null)
    setAttributeSelections({})
    setEditingStep('type')
  }

  const handleTypeSelect = (type: string) => {
    setSelectedType(type)
    setAttributeSelections({})
    const attrs = questionAttributesConfig.filter((c) =>
      c.questionTypes.includes(type),
    )
    if (attrs.length > 0) {
      setEditingStep(attrs[0].attributeId)
    }
  }

  const handleAttributeSelect = (attributeId: string, value: string) => {
    setAttributeSelections((prev) => ({
      ...prev,
      [attributeId]: value,
    }))

    const currentIndex = visibleAttributes.findIndex(
      (a) => a.attributeId === attributeId,
    )
    const newVisibleAttrs = questionAttributesConfig.filter((config) => {
      if (!selectedType || !config.questionTypes.includes(selectedType)) {
        return false
      }
      return true
    })

    if (currentIndex < newVisibleAttrs.length - 1) {
      setEditingStep(newVisibleAttrs[currentIndex + 1].attributeId)
    }
  }

  const buildAttributes = () => {
    const attributes: Record<
      string,
      string | number | boolean | { min: number; max: number }
    > = {}
    for (const attrConfig of visibleAttributes) {
      const selectedOption =
        attributeSelections[attrConfig.attributeId] || attrConfig.defaultOption
      const option = attrConfig.options.find((o) => o.value === selectedOption)
      if (option) {
        attributes[attrConfig.attributeId] = option.attributeValue
      }
    }
    return attributes
  }

  const doConfirm = () => {
    if (!selectedType) return
    const attributes = buildAttributes()
    onConfirm({
      type: selectedType,
      attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
    })
  }

  const handleConfirm = () => {
    if (!selectedType) return
    if (entity && subquestionsWouldChange(entity, selectedType)) {
      setShowAlert(true)
      return
    }
    doConfirm()
  }

  const isComplete = selectedType !== null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {initialType ? 'Change Question Type' : 'Add Question'}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Select a question category, type, and any type-specific options
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {/* Category - Always show all options */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Select Category</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {questionCategories.map((category) => (
                  <CategoryCard
                    key={category.id}
                    config={category}
                    isSelected={selectedCategory === category.id}
                    onSelect={() => handleCategorySelect(category.id)}
                  />
                ))}
              </div>
            </div>

            {/* Question Type - Collapsed Summary or Expanded Selection */}
            {selectedCategory && (
              <>
                {selectedType && editingStep !== 'type' ? (
                  <SelectionSummary
                    label="Question Type"
                    selectedLabel={selectedTypeConfig?.label || ''}
                    icon={selectedTypeConfig?.icon}
                    onEdit={() => setEditingStep('type')}
                  />
                ) : (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">
                      Select Question Type
                    </Label>
                    {ungroupedTypesInCategory.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {ungroupedTypesInCategory.map((card) => (
                          <QuestionTypeCard
                            key={card.type}
                            config={card}
                            isSelected={selectedType === card.type}
                            onSelect={() => handleTypeSelect(card.type)}
                          />
                        ))}
                      </div>
                    )}
                    {Object.entries(subcategoryGroups).map(
                      ([subcategory, cards]) => (
                        <div key={subcategory} className="space-y-2">
                          <Label className="text-xs font-medium text-muted-foreground">
                            {subcategory}
                          </Label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {cards.map((card) => (
                              <QuestionTypeCard
                                key={card.type}
                                config={card}
                                isSelected={selectedType === card.type}
                                onSelect={() => handleTypeSelect(card.type)}
                              />
                            ))}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </>
            )}

            {/* Type-specific attributes */}
            {visibleAttributes.map((attrConfig, index) => {
              const isCurrentStep = editingStep === attrConfig.attributeId
              const isPastStep =
                editingStep !== 'type' && getCurrentAttributeIndex() > index
              const hasSelection = !!attributeSelections[attrConfig.attributeId]

              if (
                (isPastStep || (hasSelection && !isCurrentStep)) &&
                editingStep !== 'type'
              ) {
                return (
                  <SelectionSummary
                    key={attrConfig.attributeId}
                    label={attrConfig.label}
                    selectedLabel={getSelectedOptionLabel(attrConfig)}
                    icon={getSelectedOptionIcon(attrConfig)}
                    onEdit={() => setEditingStep(attrConfig.attributeId)}
                  />
                )
              }

              if (isCurrentStep) {
                return (
                  <div key={attrConfig.attributeId} className="space-y-3">
                    <Label className="text-sm font-medium">
                      {attrConfig.label}
                    </Label>
                    {attrConfig.inputType === 'cards' && (
                      <div className="grid grid-cols-3 gap-2">
                        {attrConfig.options.map((option) => (
                          <AttributeOptionCard
                            key={option.value}
                            option={option}
                            isSelected={
                              (attributeSelections[attrConfig.attributeId] ||
                                attrConfig.defaultOption) === option.value
                            }
                            onSelect={() =>
                              handleAttributeSelect(
                                attrConfig.attributeId,
                                option.value,
                              )
                            }
                          />
                        ))}
                      </div>
                    )}
                    {attrConfig.inputType === 'radio' && (
                      <RadioGroup
                        value={
                          attributeSelections[attrConfig.attributeId] ||
                          attrConfig.defaultOption
                        }
                        onValueChange={(value) =>
                          handleAttributeSelect(attrConfig.attributeId, value)
                        }
                        className="space-y-1"
                      >
                        {attrConfig.options.map((option) => (
                          <label
                            key={option.value}
                            htmlFor={`${attrConfig.attributeId}-${option.value}`}
                            className="flex items-center space-x-2 p-2 rounded-md cursor-pointer hover:bg-accent"
                          >
                            <RadioGroupItem
                              value={option.value}
                              id={`${attrConfig.attributeId}-${option.value}`}
                            />
                            <span className="font-normal">{option.label}</span>
                          </label>
                        ))}
                      </RadioGroup>
                    )}
                  </div>
                )
              }

              return null
            })}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={!isComplete}>
              {initialType ? 'Change Type' : 'Add Question'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change question type?</AlertDialogTitle>
            <AlertDialogDescription>
              Changing to this matrix type will update all existing subquestions
              to match its default type.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowAlert(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowAlert(false)
                doConfirm()
              }}
            >
              Change type
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
