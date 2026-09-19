import React from 'react'

import { Label } from 'component/shadcn/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'component/shadcn/select'
import { cn } from 'common/cn'

import { defaultPlaceholderValue } from './DefaultableValueInput'

interface DefaultableSelectInputProps {
  label: string
  value: string | boolean | null | undefined
  onChange: (value: string | null) => void
  options: Array<{ value: string; label: string }>
  hasDefaults?: boolean
  defaultValue?: string | boolean
  helpText?: string
  className?: string
  disabled?: boolean
}

export const DefaultableSelectInput: React.FC<DefaultableSelectInputProps> = ({
  label,
  value,
  onChange,
  options,
  hasDefaults = false,
  defaultValue,
  helpText,
  className,
  disabled = false,
}) => {
  // Convert value to string for Form.Select
  const getSelectValue = () => {
    if (value === null || value === undefined) {
      return defaultPlaceholderValue
    }
    // For boolean values, we need to convert to the option value (Yes/No)
    if (typeof value === 'boolean') {
      // Find the matching option for this boolean value
      const matchingOption = options.find(
        (opt) =>
          (value && (opt.value === 'Yes' || opt.value === 'True')) ||
          (!value && (opt.value === 'No' || opt.value === 'False')),
      )
      return matchingOption?.value || String(value)
    }
    return String(value)
  }

  // Get the display value for the default option
  const getDefaultDisplayValue = () => {
    if (defaultValue === undefined || defaultValue === null) {
      return 'Default'
    }

    // For boolean values, find the corresponding option label
    if (typeof defaultValue === 'boolean') {
      const matchingOption = options.find(
        (opt) =>
          (defaultValue && (opt.value === 'Yes' || opt.value === 'True')) ||
          (!defaultValue && (opt.value === 'No' || opt.value === 'False')),
      )
      return `${matchingOption?.label || String(defaultValue)} (default)`
    }

    // For string values, find the matching option or use the value directly
    const matchingOption = options.find((opt) => opt.value === defaultValue)
    return `${matchingOption?.label || String(defaultValue)} (default)`
  }

  return (
    <div className={cn('space-y-2', className)}>
      <Label>{label}</Label>
      <Select
        value={getSelectValue()}
        onValueChange={(selectedValue) => {
          const convertedValue =
            selectedValue === defaultPlaceholderValue ? null : selectedValue
          onChange(convertedValue)
        }}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          {hasDefaults && (
            <SelectItem value={defaultPlaceholderValue}>
              {getDefaultDisplayValue()}
            </SelectItem>
          )}
          {options.map(({ value: optionValue, label: optionLabel }) => (
            <SelectItem key={optionValue} value={optionValue}>
              {optionLabel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {helpText && <p className="text-sm text-muted-foreground">{helpText}</p>}
    </div>
  )
}
