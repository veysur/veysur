import React from 'react'

import { Label } from 'component/shadcn/label'
import { Input } from 'component/shadcn/input'
import { cn } from 'common/cn'

import { DefaultableWrapper } from './DefaultableWrapper'

export const defaultPlaceholderValue = ':default'

interface DefaultableValueInputProps {
  label: string
  currentValue: string | number | null | undefined
  defaultValue?: string | number
  section: string
  field: string
  handler: (section: string, field: string, value: string | null) => void
  hasDefaults?: boolean
  type?: 'text' | 'number' | 'email' | 'url' | 'datetime-local'
  placeholder?: string
  helpText?: string
  className?: string
  min?: number
  max?: number
  step?: number
}

export const DefaultableValueInput: React.FC<DefaultableValueInputProps> = ({
  label,
  currentValue,
  defaultValue,
  section,
  field,
  handler,
  hasDefaults = false,
  type = 'text',
  placeholder,
  helpText,
  className,
  min,
  max,
  step,
}) => {
  const onChange = (value: string | number | null) => {
    // Convert to string for the handler (as that's what the current handlers expect)
    const stringValue = value === null ? null : String(value)
    handler(section, field, stringValue)
  }

  // When hasDefaults is false, render a simple input without defaults functionality
  if (!hasDefaults) {
    return (
      <div className={cn('space-y-2', className)}>
        <Label>{label}</Label>
        <Input
          type={type}
          value={currentValue?.toString() || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || `Enter ${label.toLowerCase()}`}
          min={min}
          max={max}
          step={step}
        />
        {helpText && (
          <p className="text-sm text-muted-foreground">{helpText}</p>
        )}
      </div>
    )
  }

  return (
    <DefaultableWrapper
      label={label}
      currentValue={currentValue}
      defaultValue={defaultValue ?? ''}
      onChange={onChange}
      className={className}
      helpText={helpText}
    >
      {({ value, isUsingDefault, onChange: handleChange }) => (
        <Input
          type={type}
          value={String(value || '')}
          onChange={(e) => handleChange(e.target.value)}
          disabled={isUsingDefault}
          placeholder={
            isUsingDefault
              ? `Default: ${defaultValue}`
              : placeholder || `Enter ${label.toLowerCase()}`
          }
          min={min}
          max={max}
          step={step}
        />
      )}
    </DefaultableWrapper>
  )
}
