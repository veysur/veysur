import { FieldError } from 'component/Form'
import { Label } from 'component/shadcn/label'
import { Input } from 'component/shadcn/input'

import { AttributeConfig } from '../SurveyAttributesPanel/attributesConfig'

const EXAMPLE_PATTERN = '[A-Z]{2}\\d{4}'

export const PatternInput: AttributeConfig['component'] = function ({
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
      <Input
        type="text"
        placeholder={EXAMPLE_PATTERN}
        onChange={(e) => onChange(e.target.value)}
        value={value}
        className={!isValid ? 'border-destructive' : ''}
      />
      <p className="mt-1 text-xs text-muted-foreground">
        Example: <code>{EXAMPLE_PATTERN}</code> accepts AB1234.
      </p>
      {!isValid && attributeErrors && (
        <FieldError className="mt-1">{attributeErrors}</FieldError>
      )}
    </div>
  )
}
