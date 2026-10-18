import React from 'react'

import { Label } from 'component/shadcn/label'

import { DefaultableWrapper } from './DefaultableWrapper'

type Props = {
  label: string
  htmlFor: string
  /** True on a survey, where each value can inherit the project's */
  hasDefaults: boolean
  /** null or undefined inherits the default */
  currentValue: string | null | undefined
  defaultValue: string
  onChange: (value: string | null) => void
  children: (field: {
    value: string
    onChange: (value: string) => void
    isUsingDefault: boolean
  }) => React.ReactNode
}

export const OverridableTextField: React.FC<Props> = ({
  label,
  htmlFor,
  hasDefaults,
  currentValue,
  defaultValue,
  onChange,
  children,
}) => {
  if (!hasDefaults) {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={htmlFor}>{label}</Label>
        {children({
          value: currentValue ?? '',
          onChange,
          isUsingDefault: false,
        })}
      </div>
    )
  }

  return (
    <DefaultableWrapper
      label={label}
      currentValue={currentValue}
      defaultValue={defaultValue}
      onChange={onChange}
    >
      {children}
    </DefaultableWrapper>
  )
}
