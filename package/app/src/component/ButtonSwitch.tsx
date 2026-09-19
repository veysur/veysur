import * as React from 'react'
import { useState } from 'react'

import { ButtonGroup } from 'component/shadcn/button-group'

type ButtonSwitchProps = {
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  orientation?: 'horizontal' | 'vertical'
  children: React.ReactNode
} & Omit<
  React.ComponentProps<typeof ButtonGroup>,
  'children' | 'orientation' | 'onChange'
>

type ButtonSwitchChildProps = {
  value?: string
  type?: string
  variant?: string
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
}

export function ButtonSwitch({
  value,
  defaultValue,
  onChange,
  orientation = 'horizontal',
  children,
  ...buttonGroupProps
}: ButtonSwitchProps) {
  // Internal state for uncontrolled mode
  const [internalValue, setInternalValue] = useState<string | undefined>(
    defaultValue,
  )

  // Determine the active value (controlled or uncontrolled)
  const activeValue = value !== undefined ? value : internalValue

  // Handle button click
  const handleButtonClick = (buttonValue: string) => {
    // Update internal state if uncontrolled
    if (value === undefined) {
      setInternalValue(buttonValue)
    }

    // Trigger onChange callback
    if (onChange) {
      onChange(buttonValue)
    }
  }

  // Clone children and inject props
  const enhancedChildren = React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) {
      return child
    }

    // Extract the value prop from the child
    const childProps = child.props as ButtonSwitchChildProps
    const childValue = childProps.value

    if (childValue === undefined) {
      console.warn('ButtonSwitch: Button child is missing a value prop', child)
      return child
    }

    // Determine if this button is active
    const isActive = childValue === activeValue

    // Clone the child and inject our props
    return React.cloneElement(
      child as React.ReactElement<ButtonSwitchChildProps>,
      {
        type: childProps.type || 'button',
        variant: isActive ? 'default' : 'outline',
        onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
          // Call the original onClick if it exists
          if (childProps.onClick) {
            childProps.onClick(e)
          }
          // Call our handler
          handleButtonClick(childValue)
        },
      },
    )
  })

  return (
    <ButtonGroup orientation={orientation} {...buttonGroupProps}>
      {enhancedChildren}
    </ButtonGroup>
  )
}
