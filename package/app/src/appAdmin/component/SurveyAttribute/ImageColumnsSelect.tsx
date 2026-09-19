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
import { questionAttributesConfig } from './questionAttributeConfig'
import { ATTRIBUTE_QUESTION_COLUMNS } from 'veysur-common'

const columnsAttributeConfig = questionAttributesConfig.find(
  (config) => config.attributeId === ATTRIBUTE_QUESTION_COLUMNS,
)

export const ImageColumnsSelect: AttributeConfig['component'] = function ({
  config,
  isValid,
  errors,
  value,
  onChange,
}) {
  const attributeErrors =
    !!errors && !!errors[config.name] && errors[config.name].join(',')

  // Value stored as number, Select works with strings
  const stringValue = value != null ? String(value) : '1'

  return (
    <div className="mb-4">
      <Label className="mb-2">{config.name}</Label>
      <Select value={stringValue} onValueChange={(v) => onChange(Number(v))}>
        <SelectTrigger
          className={!isValid ? 'border-red-500' : ''}
          aria-label="Select columns"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {config.options &&
            Object.entries(config.options).map(([k, v]) => {
              const optionConfig = columnsAttributeConfig?.options.find(
                (opt) => opt.value === k,
              )
              const Icon = optionConfig?.icon
              return (
                <SelectItem key={k} value={k}>
                  <span className="flex items-center gap-2">
                    {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                    {v}
                  </span>
                </SelectItem>
              )
            })}
        </SelectContent>
      </Select>
      {!isValid && attributeErrors && (
        <FieldError className="mt-1">{attributeErrors}</FieldError>
      )}
    </div>
  )
}
