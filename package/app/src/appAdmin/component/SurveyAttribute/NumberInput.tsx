import { FieldError } from 'component/Form'
import { Label } from 'component/shadcn/label'
import { Input } from 'component/shadcn/input'

import {
  ChangeEventHandler,
  AttributeConfig,
} from '../SurveyAttributesPanel/attributesConfig'

export const NumberInput: AttributeConfig['component'] = function ({
  config,
  isValid,
  errors,
  value,
  onChange,
}) {
  const handleChange = (e: ChangeEventHandler) => {
    onChange(e.target.value)
  }
  const attributeErrors =
    !!errors && !!errors[config.name] && errors[config.name].join(',')
  return (
    <div className="mb-2">
      <Label>{config.name}</Label>
      <Input
        type="number"
        placeholder=""
        onChange={handleChange}
        value={value}
        className={!isValid ? 'border-red-500' : ''}
      />
      {!isValid && attributeErrors && (
        <FieldError className="mt-1">{attributeErrors}</FieldError>
      )}
    </div>
  )
}
