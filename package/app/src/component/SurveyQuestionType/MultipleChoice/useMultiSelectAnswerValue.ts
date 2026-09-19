import { CHOICE_OTHER_CODE, CHOICE_OTHER_VALUE_KEY } from 'veysur-common'

export type AnswerOptionValue = Record<string, unknown>

export type MultiSelectAnswerValue = {
  currentValue: AnswerOptionValue
  handleOptionChange: (optionCode: string, checked: boolean) => void
  handleOtherTextChange: (text: string) => void
  isOtherChecked: boolean
  otherValue: string
}

export function useMultiSelectAnswerValue(
  value: unknown,
  onChange?: (value: AnswerOptionValue) => void,
): MultiSelectAnswerValue {
  // Ensure value is an object (not array)
  const currentValue: AnswerOptionValue =
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as AnswerOptionValue)
      : {}

  const handleOptionChange = (optionCode: string, checked: boolean) => {
    if (!onChange) return

    if (checked) {
      onChange({ ...currentValue, [optionCode]: true })
    } else if (optionCode === CHOICE_OTHER_CODE) {
      // Remove OTHER and its text together
      const rest = Object.fromEntries(
        Object.entries(currentValue).filter(
          ([key]) =>
            key !== CHOICE_OTHER_CODE && key !== CHOICE_OTHER_VALUE_KEY,
        ),
      )
      onChange(rest)
    } else {
      const rest = Object.fromEntries(
        Object.entries(currentValue).filter(([key]) => key !== optionCode),
      )
      onChange(rest)
    }
  }

  const handleOtherTextChange = (text: string) => {
    if (!onChange) return
    onChange({ ...currentValue, [CHOICE_OTHER_VALUE_KEY]: text })
  }

  const isOtherChecked = currentValue[CHOICE_OTHER_CODE] === true
  const otherValue =
    typeof currentValue[CHOICE_OTHER_VALUE_KEY] === 'string'
      ? (currentValue[CHOICE_OTHER_VALUE_KEY] as string)
      : ''

  return {
    currentValue,
    handleOptionChange,
    handleOtherTextChange,
    isOtherChecked,
    otherValue,
  }
}
