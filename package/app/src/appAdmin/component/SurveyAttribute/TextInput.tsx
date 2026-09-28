import { FieldError } from 'component/Form'
import { Label } from 'component/shadcn/label'
import { Input } from 'component/shadcn/input'

import {
  ChangeEventHandler,
  AttributeConfig,
} from '../SurveyAttributesPanel/attributesConfig'

export const TextInput: AttributeConfig['component'] = function ({
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
    <div className="mb-4">
      <Label className="mb-2">{config.name}</Label>
      <Input
        type="text"
        placeholder=""
        onChange={handleChange}
        value={value}
        className={!isValid ? 'border-destructive' : ''}
      />
      {!isValid && attributeErrors && (
        <FieldError className="mt-1">{attributeErrors}</FieldError>
      )}
    </div>
  )
}
