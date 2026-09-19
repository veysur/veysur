import { FieldError } from 'component/Form'
import { useState } from 'react'
import { cn } from 'common/cn'

import { Label } from 'component/shadcn/label'
import { Button } from 'component/shadcn/button'
import {
  MouseEventHandler,
  AttributeConfig,
} from '../SurveyAttributesPanel/attributesConfig'

const ANSWER_YES = 'true'
const ANSWER_NO = 'false'

export const YesNo: AttributeConfig['component'] = function ({
  config,
  isValid,
  errors,
  value,
  onChange,
}) {
  const [selectedValue, setSelectedValue] = useState(value)

  const handleChange = (e: MouseEventHandler) => {
    setSelectedValue((e.target as HTMLInputElement).value === ANSWER_YES)
    onChange((e.target as HTMLInputElement).value === ANSWER_YES)
  }

  const attributeErrors =
    !!errors && !!errors[config.name] && errors[config.name].join(',')

  return (
    <div className="grid mb-4">
      <Label className="mb-2">{config.name}</Label>
      <div role="group">
        <Button
          type="button"
          className={cn(
            'rounded-r-none',
            selectedValue && 'bg-primary text-primary-foreground',
          )}
          variant={selectedValue ? 'default' : 'outline'}
          value={ANSWER_YES}
          onClick={handleChange}
        >
          Yes
        </Button>
        <Button
          type="button"
          className={cn(
            'rounded-l-none',
            !selectedValue && 'bg-primary text-primary-foreground',
          )}
          variant={!selectedValue ? 'default' : 'outline'}
          value={ANSWER_NO}
          onClick={handleChange}
        >
          No
        </Button>
      </div>
      {!isValid && attributeErrors && (
        <FieldError className="mt-1">{attributeErrors}</FieldError>
      )}
    </div>
  )
}
