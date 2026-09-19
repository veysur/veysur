import { useState } from 'react'
import { Label } from 'component/shadcn/label'
import { Input } from 'component/shadcn/input'
import { RadioGroup, RadioGroupItem } from 'component/shadcn/radio-group'
import { FieldError } from 'component/Form'
import {
  ChangeEventHandler,
  AttributeConfig,
} from '../SurveyAttributesPanel/attributesConfig'
import { useValidatedInternalValue } from './useValidatedInternalValue'

export const SelectionRules: AttributeConfig['component'] = function ({
  config,
  isValid,
  errors,
  value,
  onChange,
}) {
  const computeValue = () =>
    (value?.min !== undefined && value?.max !== undefined && value) ||
    config.initialValue || { min: 0, max: 1 }
  const [valueInternal, setValueInternal] = useValidatedInternalValue(
    value,
    isValid,
    computeValue,
  )

  // Selection mode is tracked independently of min/max so that typing a Max
  // value of 1 while in "multiple" mode does not get reinterpreted as the
  // "single" preset ({ min: 0, max: 1 }) and flip the radio selection.
  const [selectionMode, setSelectionMode] = useState<'single' | 'multiple'>(
    () => {
      const initial = computeValue()
      return initial.min === 0 && initial.max === 1 ? 'single' : 'multiple'
    },
  )

  const handleSelectionModeChange = (mode: string) => {
    if (mode === 'single') {
      // Allow one selection: set min: 0, max: 1
      const newValue = { min: 0, max: 1 }
      setSelectionMode('single')
      setValueInternal(newValue)
      onChange(newValue)
    } else {
      // Allow multiple selections: use default or current values (but not single selection values)
      const newValue = { min: 0, max: 0 }
      setSelectionMode('multiple')
      setValueInternal(newValue)
      onChange(newValue)
    }
  }

  const handleChangeMin = (e: ChangeEventHandler) => {
    const min = e.target.value === '' ? 0 : e.target.value
    const newValue = { ...valueInternal, min }
    setValueInternal(newValue)
    onChange(newValue)
  }

  const handleChangeMax = (e: ChangeEventHandler) => {
    const max = e.target.value === '' ? 0 : e.target.value
    const newValue = { ...valueInternal, max }
    setValueInternal(newValue)
    onChange(newValue)
  }

  // 0 means "no limit" on either bound — show the placeholder instead of a
  // literal 0 so the field reads as unset rather than zero-selectable.
  const minDisplayValue =
    Number(valueInternal.min) === 0 ? '' : valueInternal.min
  const maxDisplayValue =
    Number(valueInternal.max) === 0 ? '' : valueInternal.max

  const errorsMin =
    !!errors &&
    !!errors[config.name + '.min'] &&
    errors[config.name + '.min'].join(',')
  const errorsMax =
    !!errors &&
    !!errors[config.name + '.max'] &&
    errors[config.name + '.max'].join(',')

  return (
    <div className="mb-4">
      <div className="mb-4">
        <Label className="mb-2">{config.name}</Label>
        <RadioGroup
          value={selectionMode}
          onValueChange={handleSelectionModeChange}
          className="gap-1 ms-1"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="single" id="selection-single" />
            <label
              htmlFor="selection-single"
              className="m-0 cursor-pointer text-sm"
            >
              Select one
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="multiple" id="selection-multiple" />
            <label
              htmlFor="selection-multiple"
              className="m-0 cursor-pointer text-sm"
            >
              Select multiple
            </label>
          </div>
        </RadioGroup>
      </div>

      {selectionMode === 'multiple' && (
        <div className="grid grid-cols-2 gap-4 mt-3">
          <div>
            <Label className="mb-1">Min</Label>
            <Input
              type="number"
              placeholder="no min"
              onChange={handleChangeMin}
              value={minDisplayValue}
              className={!isValid && !!errorsMin ? 'border-red-500' : ''}
            />
            {!isValid && errorsMin && (
              <FieldError className="mt-1">{errorsMin}</FieldError>
            )}
          </div>
          <div>
            <Label className="mb-1">Max</Label>
            <Input
              type="number"
              placeholder="no max"
              onChange={handleChangeMax}
              value={maxDisplayValue}
              className={!isValid && !!errorsMax ? 'border-red-500' : ''}
            />
            {!isValid && errorsMax && (
              <FieldError className="mt-1">{errorsMax}</FieldError>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
