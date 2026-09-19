import { FieldError } from 'component/Form'
import { useState } from 'react'

import { cn } from 'common/cn'
import { Label } from 'component/shadcn/label'
import { Button } from 'component/shadcn/button'
import { ConfirmDialog } from 'component/DialogConfirmClickable'

import { AttributeConfig } from '../SurveyAttributesPanel/attributesConfig'
import { questionTypeOptions } from './questionAttributeConfig'
import { QuestionTypeModal } from '../SurveyEditor/QuestionTypeModal'
import { useStructuralChangeGuard } from '../SurveyEditor/hook/useStructuralChangeGuard'

export const QuestionTypeSelect: AttributeConfig['component'] = function ({
  config,
  isValid,
  errors,
  value,
  onChange,
  entity,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { guardQuestionTypeChange, dialogState, closeDialog } =
    useStructuralChangeGuard()

  const attributeErrors =
    !!errors && !!errors[config.name] && errors[config.name].join(',')

  const selectedTypeConfig = questionTypeOptions.find((t) => t.type === value)
  const Icon = selectedTypeConfig?.icon

  const handleConfirm = ({ type }: { type: string }) => {
    setIsModalOpen(false)
    guardQuestionTypeChange(entity._id, type, () => onChange(type))
  }

  return (
    <>
      <div className="mb-4">
        <Label className="mb-2">{config.name}</Label>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start gap-2',
            !isValid && 'border-red-500',
          )}
          onClick={() => setIsModalOpen(true)}
        >
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          {selectedTypeConfig?.label ?? value}
        </Button>
        {!isValid && attributeErrors && (
          <FieldError className="mt-1">{attributeErrors}</FieldError>
        )}
      </div>

      <QuestionTypeModal
        key={isModalOpen ? 'open' : 'closed'}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        initialType={value}
        entity={entity}
        onConfirm={handleConfirm}
      />

      <ConfirmDialog
        open={dialogState.open}
        title="This question type change affects a condition"
        message={dialogState.message}
        actionText="Change type anyway"
        onConfirm={dialogState.onConfirm}
        onOpenChange={(open) => !open && closeDialog()}
      />
    </>
  )
}
