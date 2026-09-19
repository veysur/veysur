import React from 'react'
import { Settings } from 'lucide-react'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from 'component/shadcn/tooltip'
import { Label } from 'component/shadcn/label'
import { Checkbox } from 'component/shadcn/checkbox'
import { cn } from 'common/cn'

import { useDefaultableState } from './useDefaultableState'

interface DefaultableWrapperSharedProps {
  /**
   * Label for the field group
   */
  label?: string

  /**
   * Optional additional class name for the wrapper
   */
  className?: string

  /**
   * Optional help text to display below the field
   */
  helpText?: string
}

interface DefaultableWrapperUncontrolledProps<
  T,
> extends DefaultableWrapperSharedProps {
  /**
   * Current value (null/undefined means use default)
   */
  currentValue?: T | null | undefined

  /**
   * Default value to use when "Use Default" is checked
   */
  defaultValue: T

  /**
   * Callback when value changes (null = use default, actual value otherwise)
   */
  onChange: (value: T | null) => void

  isUsingDefault?: undefined
  onUseDefaultChange?: undefined

  /**
   * Render function that receives defaultable state and handlers
   */
  children: (props: {
    value: T
    isUsingDefault: boolean
    onChange: (value: T) => void
  }) => React.ReactNode
}

interface DefaultableWrapperControlledProps extends DefaultableWrapperSharedProps {
  /**
   * External control: whether currently using default
   */
  isUsingDefault: boolean

  /**
   * External control: callback when "Use Default" checkbox changes
   */
  onUseDefaultChange: (useDefault: boolean) => void

  currentValue?: undefined
  defaultValue?: undefined
  onChange?: undefined

  children: React.ReactNode
}

type DefaultableWrapperProps<T> =
  DefaultableWrapperUncontrolledProps<T> | DefaultableWrapperControlledProps

function DefaultableWrapperShell({
  label,
  className,
  helpText,
  showCheckboxRow,
  isUsingDefault,
  onUseDefaultChange,
  children,
}: DefaultableWrapperSharedProps & {
  showCheckboxRow: boolean
  isUsingDefault: boolean
  onUseDefaultChange: (useDefault: boolean) => void
  children: React.ReactNode
}) {
  const checkboxId = `use-default-${label?.replace(/\s+/g, '-').toLowerCase() || 'field'}`

  return (
    <div className={cn('space-y-2', className)}>
      {showCheckboxRow && (
        <div className="flex items-center justify-between mb-2">
          {label ? <Label className="mb-0">{label}</Label> : <div />}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={checkboxId}
                  checked={isUsingDefault}
                  onCheckedChange={(checked) =>
                    onUseDefaultChange(checked === true)
                  }
                />
                <label htmlFor={checkboxId} className="text-sm cursor-pointer">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </label>
              </div>
            </TooltipTrigger>
            <TooltipContent>Default</TooltipContent>
          </Tooltip>
        </div>
      )}
      {children}
      {helpText && <p className="text-sm text-muted-foreground">{helpText}</p>}
    </div>
  )
}

function DefaultableWrapperUncontrolled<T>({
  label,
  currentValue,
  defaultValue,
  onChange,
  className,
  children,
  helpText,
}: DefaultableWrapperUncontrolledProps<T>) {
  const {
    isUsingDefault,
    displayValue,
    handleUseDefaultChange,
    handleValueChange,
  } = useDefaultableState(currentValue, defaultValue, onChange)

  return (
    <DefaultableWrapperShell
      label={label}
      className={className}
      helpText={helpText}
      showCheckboxRow={!!label}
      isUsingDefault={isUsingDefault}
      onUseDefaultChange={handleUseDefaultChange}
    >
      {children({
        value: displayValue,
        isUsingDefault,
        onChange: handleValueChange,
      })}
    </DefaultableWrapperShell>
  )
}

function DefaultableWrapperControlled({
  label,
  isUsingDefault,
  onUseDefaultChange,
  className,
  children,
  helpText,
}: DefaultableWrapperControlledProps) {
  return (
    <DefaultableWrapperShell
      label={label}
      className={className}
      helpText={helpText}
      showCheckboxRow={true}
      isUsingDefault={isUsingDefault}
      onUseDefaultChange={onUseDefaultChange}
    >
      {children}
    </DefaultableWrapperShell>
  )
}

/**
 * Wrapper component that makes any child component(s) defaultable.
 *
 * Supports two modes:
 *
 * 1. Uncontrolled mode (render props) - manages state internally:
 * ```tsx
 * <DefaultableWrapper
 *   label="Subject"
 *   currentValue={currentSubject}
 *   defaultValue={defaultSubject}
 *   onChange={handleChange}
 * >
 *   {({ value, isUsingDefault, onChange }) => (
 *     <Input
 *       value={value}
 *       onChange={(e) => onChange(e.target.value)}
 *       disabled={isUsingDefault}
 *     />
 *   )}
 * </DefaultableWrapper>
 * ```
 *
 * 2. Controlled mode (external state) - for multiple fields or complex logic:
 * ```tsx
 * <DefaultableWrapper
 *   isUsingDefault={isUsingDefault}
 *   onUseDefaultChange={handleUseDefaultChange}
 * >
 *   <Input value={value} onChange={handleChange} disabled={isUsingDefault} />
 * </DefaultableWrapper>
 * ```
 */
export function DefaultableWrapper<T = unknown>(
  props: DefaultableWrapperProps<T>,
) {
  if ('onUseDefaultChange' in props && props.onUseDefaultChange) {
    return <DefaultableWrapperControlled {...props} />
  }
  return <DefaultableWrapperUncontrolled {...props} />
}
