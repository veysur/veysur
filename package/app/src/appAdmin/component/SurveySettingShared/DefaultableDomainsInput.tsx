import React from 'react'
import { parseEmbedDomains } from 'veysur-common'

import { Label } from 'component/shadcn/label'
import { Textarea } from 'component/shadcn/textarea'
import { cn } from 'common/cn'

import { DefaultableWrapper } from './DefaultableWrapper'

type Props = {
  label: string
  currentValue: string[] | null | undefined
  defaultValue?: string[]
  hasDefaults?: boolean
  // null = no list of its own (inherit the default)
  onChange: (value: string[] | null) => void
  helpText?: string
  className?: string
}

// One hostname per line. Saved on blur, so a patch is not buffered per
// keystroke; the key resets the box to the normalised list after a save.
const DomainsTextarea: React.FC<{
  value: string[]
  disabled?: boolean
  onCommit: (value: string[]) => void
}> = ({ value, disabled, onCommit }) => {
  const text = value.join('\n')

  return (
    <Textarea
      key={text}
      defaultValue={text}
      rows={3}
      disabled={disabled}
      placeholder="example.com"
      onBlur={(event) => {
        const parsed = parseEmbedDomains(event.target.value)
        if (parsed.join('\n') !== text) {
          onCommit(parsed)
        }
      }}
    />
  )
}

export const DefaultableDomainsInput: React.FC<Props> = ({
  label,
  currentValue,
  defaultValue = [],
  hasDefaults = false,
  onChange,
  helpText,
  className,
}) => {
  if (!hasDefaults) {
    return (
      <div className={cn('space-y-2', className)}>
        <Label>{label}</Label>
        <DomainsTextarea value={currentValue ?? []} onCommit={onChange} />
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
      defaultValue={defaultValue}
      onChange={onChange}
      className={className}
      helpText={helpText}
    >
      {({ value, isUsingDefault, onChange: handleChange }) => (
        <DomainsTextarea
          value={value}
          disabled={isUsingDefault}
          onCommit={handleChange}
        />
      )}
    </DefaultableWrapper>
  )
}
