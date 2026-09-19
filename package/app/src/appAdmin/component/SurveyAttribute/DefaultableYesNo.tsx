import { FieldError } from 'component/Form'
import { DefaultableButtonSwitch } from 'appAdmin/component/SurveySettingShared'

import { AttributeConfig } from '../SurveyAttributesPanel/attributesConfig'

const YES_NO_OPTIONS = [
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No' },
]

export const DefaultableYesNo: AttributeConfig['component'] = function ({
  config,
  isValid,
  errors,
  value,
  onChange,
  hasDefaults = false,
  defaultValue,
}) {
  const attributeErrors =
    !!errors && !!errors[config.name] && errors[config.name].join(',')

  const handleChange = (stringValue: string | null) => {
    if (stringValue === null) {
      // User selected "Default" - pass null to indicate use default
      onChange(null)
    } else {
      // Convert string to boolean
      onChange(stringValue === 'Yes')
    }
  }

  return (
    <div className="grid mb-4">
      <DefaultableButtonSwitch
        label={config.name}
        value={value}
        defaultValue={defaultValue}
        hasDefaults={hasDefaults}
        options={YES_NO_OPTIONS}
        onChange={handleChange}
      />
      {!isValid && attributeErrors && (
        <FieldError className="mt-1">{attributeErrors}</FieldError>
      )}
    </div>
  )
}
