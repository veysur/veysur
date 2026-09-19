import { useCallback, useEffect, useState } from 'react'

// Parse value to number, handling both number and string inputs from database
const parseRatingValue = (value: unknown, max: number): number | null => {
  if (typeof value === 'number' && value >= 1 && value <= max) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10)
    if (!isNaN(parsed) && parsed >= 1 && parsed <= max) {
      return parsed
    }
  }
  return null
}

export function useRatingSelection(
  value: unknown,
  max: number,
  onChange?: (value: number | undefined) => void,
) {
  const [hoverValue, setHoverValue] = useState<number | null>(null)

  const selectedValue = parseRatingValue(value, max)
  const displayValue = hoverValue !== null ? hoverValue : selectedValue

  // Normalize string values to numbers on mount/value change
  // This ensures that string values from the database are converted to numbers
  useEffect(() => {
    if (typeof value === 'string' && selectedValue !== null && onChange) {
      onChange(selectedValue)
    }
  }, [value, selectedValue, onChange])

  const handleClick = useCallback(
    (ratingValue: number) => {
      if (!onChange) return
      onChange(selectedValue === ratingValue ? undefined : ratingValue)
    },
    [onChange, selectedValue],
  )

  const handleMouseEnter = useCallback((ratingValue: number) => {
    setHoverValue(ratingValue)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setHoverValue(null)
  }, [])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, ratingValue: number) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        handleClick(ratingValue)
      }
    },
    [handleClick],
  )

  return {
    selectedValue,
    displayValue,
    handleClick,
    handleMouseEnter,
    handleMouseLeave,
    handleKeyDown,
  }
}
