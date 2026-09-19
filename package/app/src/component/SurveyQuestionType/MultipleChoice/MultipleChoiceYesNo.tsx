import React, { useEffect } from 'react'

import { Button } from 'component/shadcn/button'
import { ButtonGroup } from 'component/shadcn/button-group'

import { QuestionTypeProps } from '../QuestionTypeProps'

const YES_NO_OPTIONS = [
  { value: true, label: 'Yes' },
  { value: false, label: 'No' },
] as const

// Parse value to boolean, handling both boolean and string inputs from database
const parseBooleanValue = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'string') {
    if (value === 'true') return true
    if (value === 'false') return false
  }
  return null
}

export const MultipleChoiceYesNo: React.FC<QuestionTypeProps> = ({
  value,
  onChange,
}) => {
  const normalizedValue = parseBooleanValue(value)

  // Normalize string values to booleans on mount/value change
  // This ensures that string values from the database are converted to booleans
  useEffect(() => {
    if (typeof value === 'string' && normalizedValue !== null && onChange) {
      onChange(normalizedValue)
    }
  }, [value, normalizedValue, onChange])

  const handleOptionClick = (optionValue: boolean) => {
    if (!onChange) return
    // Toggle: if already selected, deselect; otherwise select
    onChange(normalizedValue === optionValue ? undefined : optionValue)
  }

  return (
    <ButtonGroup>
      {YES_NO_OPTIONS.map((option) => {
        const isSelected = normalizedValue === option.value

        return (
          <Button
            key={option.label}
            type="button"
            variant={isSelected ? 'default' : 'outline'}
            className={`transition-transform duration-150 hover:scale-110 active:scale-95 ${isSelected ? 'ring-primary' : ''}`}
            onClick={() => handleOptionClick(option.value)}
          >
            {option.label}
          </Button>
        )
      })}
    </ButtonGroup>
  )
}
