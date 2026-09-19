import { useState } from 'react'

import { FieldError } from 'component/Form'
import { cn } from 'common/cn'
import { Label } from 'component/shadcn/label'
import { Button } from 'component/shadcn/button'

import { AttributeConfig } from '../SurveyAttributesPanel/attributesConfig'
import { contentTypeOptions } from './contentAttributeConfig'
import { ContentTypeModal } from '../SurveyEditor/ContentTypeModal'

export const ContentTypeSelect: AttributeConfig['component'] = function ({
  config,
  isValid,
  errors,
  value,
  onChange,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const attributeErrors =
    !!errors && !!errors[config.name] && errors[config.name].join(',')

  const selectedTypeConfig = contentTypeOptions.find((t) => t.type === value)
  const Icon = selectedTypeConfig?.icon

  const handleConfirm = ({ type }: { type: string }) => {
    setIsModalOpen(false)
    onChange(type)
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

      <ContentTypeModal
        key={isModalOpen ? 'open' : 'closed'}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        initialType={value}
        onConfirm={handleConfirm}
      />
    </>
  )
}
