import React from 'react'
import { format } from 'date-fns'

import { Label } from 'component/shadcn/label'
import { DateTimePicker } from 'component/DateTimePicker'

import { DefaultableWrapper } from './DefaultableWrapper'

interface DefaultableValueDatetimeProps {
  label: string
  currentValue: Date | string | null | undefined
  defaultValue?: Date | string | null | undefined
  onChange: (value: string | null) => void
  hasDefaults?: boolean
  helpText?: string
  className?: string
}

const parseDate = (date: Date | string | null | undefined): Date | null => {
  if (!date) return null
  const d = new Date(date)
  return isNaN(d.getTime()) ? null : d
}

// Convert date to ISO string format for storage
const formatDateToISO = (date: Date | null): string | null => {
  if (!date) return null
  return date.toISOString()
}

// Convert date to display format
const formatDisplayDate = (date: Date | string | null | undefined): string => {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  return format(d, 'PPP HH:mm')
}

export const DefaultableValueDatetime: React.FC<
  DefaultableValueDatetimeProps
> = ({
  label,
  currentValue,
  defaultValue,
  onChange,
  hasDefaults = false,
  helpText,
  className,
}) => {
  const parsedCurrentValue = parseDate(currentValue)
  const parsedDefaultValue = parseDate(defaultValue)

  // When hasDefaults is false, render a simple picker without defaults functionality
  if (!hasDefaults) {
    return (
      <div className={className}>
        <Label className="mb-2">{label}</Label>
        <DateTimePicker
          value={parsedCurrentValue}
          onChange={(date) => onChange(formatDateToISO(date))}
          placeholder={`Select ${label.toLowerCase()}`}
        />
        {helpText && (
          <p className="text-sm text-muted-foreground mt-1">{helpText}</p>
        )}
      </div>
    )
  }

  const formattedCurrentValue = formatDateToISO(parsedCurrentValue)
  const formattedDefaultValue = formatDateToISO(parsedDefaultValue)
  const displayDefaultValue = formatDisplayDate(defaultValue)

  return (
    <DefaultableWrapper
      label={label}
      currentValue={formattedCurrentValue}
      defaultValue={formattedDefaultValue ?? ''}
      onChange={onChange}
      className={className}
      helpText={helpText}
    >
      {({ value, isUsingDefault, onChange: handleChange }) => {
        const currentDate = value ? new Date(value) : null

        return (
          <>
            <DateTimePicker
              value={currentDate}
              onChange={(date) => handleChange(formatDateToISO(date) ?? '')}
              placeholder={
                isUsingDefault
                  ? `Default: ${displayDefaultValue}`
                  : `Select ${label.toLowerCase()}`
              }
              disabled={isUsingDefault}
            />
            {isUsingDefault && (
              <p className="text-sm text-muted-foreground mt-1">
                Default: <strong>{displayDefaultValue}</strong>
              </p>
            )}
          </>
        )
      }}
    </DefaultableWrapper>
  )
}
