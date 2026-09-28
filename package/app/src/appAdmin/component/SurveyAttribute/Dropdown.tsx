import { FieldError } from 'component/Form'
import { Label } from 'component/shadcn/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'component/shadcn/select'

import { AttributeConfig } from '../SurveyAttributesPanel/attributesConfig'

export const Dropdown: AttributeConfig['component'] = function ({
  config,
  isValid,
  errors,
  value,
  onChange,
}) {
  const attributeErrors =
    !!errors && !!errors[config.name] && errors[config.name].join(',')
  return (
    <div className="mb-4">
      <Label className="mb-2">{config.name}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          className={!isValid ? 'border-destructive' : ''}
          aria-label="Default select example"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {config.options &&
            Object.entries(config.options).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
      {!isValid && attributeErrors && (
        <FieldError className="mt-1">{attributeErrors}</FieldError>
      )}
    </div>
  )
}
