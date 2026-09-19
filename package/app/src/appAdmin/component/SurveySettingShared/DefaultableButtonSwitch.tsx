import React from 'react'
import { Settings } from 'lucide-react'

import { Label } from 'component/shadcn/label'
import { ButtonSwitch } from 'component/ButtonSwitch'
import { Button } from 'component/shadcn/button'
import { cn } from 'common/cn'

import { defaultPlaceholderValue } from './DefaultableValueInput'

interface DefaultableButtonSwitchProps {
  label: string
  value: string | boolean | null | undefined
  onChange: (value: string | null) => void
  options: Array<{ value: string; label: string }>
  hasDefaults?: boolean
  defaultValue?: string | boolean
  helpText?: string
  className?: string
  disabled?: boolean
  orientation?: 'horizontal' | 'vertical'
}

export const DefaultableButtonSwitch: React.FC<
  DefaultableButtonSwitchProps
> = ({
  label,
  value,
  onChange,
  options,
  hasDefaults = false,
  defaultValue,
  helpText,
  className,
  disabled = false,
  orientation = 'horizontal',
}) => {
  // Convert value to string for ButtonSwitch
  const getButtonSwitchValue = () => {
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
  const getDefaultDisplayValue = (): React.ReactNode => {
    let baseLabel = 'Default'

    if (defaultValue !== undefined && defaultValue !== null) {
      // For boolean values, find the corresponding option label
      if (typeof defaultValue === 'boolean') {
        const matchingOption = options.find(
          (opt) =>
            (defaultValue && (opt.value === 'Yes' || opt.value === 'True')) ||
            (!defaultValue && (opt.value === 'No' || opt.value === 'False')),
        )
        baseLabel = matchingOption?.label || String(defaultValue)
      } else {
        // For string values, find the matching option or use the value directly
        const matchingOption = options.find((opt) => opt.value === defaultValue)
        baseLabel = matchingOption?.label || String(defaultValue)
      }
    }

    return (
      <>
        {baseLabel} <Settings className="h-4 w-4 opacity-70" />
      </>
    )
  }

  // Build the buttons array including default option at the end if needed
  const buttons: Array<{
    value: string
    label: React.ReactNode
    tooltip?: string
  }> = [...options]

  if (hasDefaults) {
    buttons.push({
      value: defaultPlaceholderValue,
      label: getDefaultDisplayValue(),
      tooltip: 'Default',
    })
  }

  return (
    <div className={cn('space-y-2', className)}>
      {label && <Label>{label}</Label>}
      <ButtonSwitch
        value={getButtonSwitchValue()}
        onChange={(selectedValue) => {
          const convertedValue =
            selectedValue === defaultPlaceholderValue ? null : selectedValue
          onChange(convertedValue)
        }}
        orientation={orientation}
      >
        {buttons.map(({ value: optionValue, label: optionLabel, tooltip }) => (
          <Button
            key={optionValue}
            value={optionValue}
            disabled={disabled}
            tooltip={tooltip}
          >
            {optionLabel}
          </Button>
        ))}
      </ButtonSwitch>
      {helpText && <p className="text-sm text-muted-foreground">{helpText}</p>}
    </div>
  )
}
