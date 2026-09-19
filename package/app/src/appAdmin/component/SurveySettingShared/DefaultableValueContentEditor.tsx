import React from 'react'
import type { ContentFormat } from 'veysur-common'

import { Label } from 'component/shadcn/label'
import { ContentEditor } from 'appAdmin/component/ContentEditor'

import { DefaultableWrapper } from './DefaultableWrapper'

interface DefaultableValueContentEditorProps {
  label: string
  currentValue: string | null | undefined
  defaultValue?: string
  onChange: (value: string | null) => void
  hasDefaults?: boolean
  placeholder?: string
  helpText?: string
  className?: string
  withToolbar?: boolean
  format?: ContentFormat
}

export const DefaultableValueContentEditor: React.FC<
  DefaultableValueContentEditorProps
> = ({
  label,
  currentValue,
  defaultValue,
  onChange,
  hasDefaults = false,
  placeholder,
  helpText,
  className,
  withToolbar = true,
  format,
}) => {
  // When hasDefaults is false, render a simple input without defaults functionality
  if (!hasDefaults) {
    return (
      <div className={className}>
        <Label>{label}</Label>
        <ContentEditor
          value={currentValue || ''}
          onChange={onChange}
          placeholder={placeholder || `Enter ${label.toLowerCase()}`}
          withToolbar={withToolbar}
          format={format}
        />
        {helpText && (
          <p className="text-sm text-muted-foreground mt-1">{helpText}</p>
        )}
      </div>
    )
  }

  return (
    <DefaultableWrapper
      label={label}
      currentValue={currentValue}
      defaultValue={defaultValue || ''}
      onChange={onChange}
      className={className}
      helpText={helpText}
    >
      {({ value, isUsingDefault, onChange: handleChange }) => (
        <ContentEditor
          value={String(value || '')}
          onChange={handleChange}
          disabled={isUsingDefault}
          placeholder={
            isUsingDefault
              ? `Default: ${defaultValue || 'No default set'}`
              : placeholder || `Enter ${label.toLowerCase()}`
          }
          withToolbar={withToolbar}
          format={format}
        />
      )}
    </DefaultableWrapper>
  )
}
