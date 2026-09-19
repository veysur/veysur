import React from 'react'
import { ChevronDownIcon } from '@radix-ui/react-icons'

import { CHOICE_OTHER_CODE, CHOICE_OTHER_VALUE_KEY } from 'veysur-common'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'component/shadcn/select'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from 'component/shadcn/popover'
import { Button } from 'component/shadcn/button'
import { Checkbox } from 'component/shadcn/checkbox'
import { Input } from 'component/shadcn/input'
import { cn } from 'common/cn'
import {
  ANSWER_CONTROL_MAX_WIDTH,
  QuestionTypeProps,
  TOGGLE_HOVER_CLASS,
  resolveLabelText,
} from '../QuestionTypeProps'
import { useChoiceMinMax } from './useChoiceMinMax'
import { useAnswerOptionsRandomised } from './useAnswerOptionsRandomised'
import { useMultiSelectAnswerValue } from './useMultiSelectAnswerValue'

export const MultipleChoiceDropdown: React.FC<QuestionTypeProps> = ({
  question,
  value = {},
  lang,
  langDefault,
  onChange,
  expressionContext,
}) => {
  const chooseMinMax = useChoiceMinMax(question?.attributes?.choiceMinMax)
  const isMultiSelect = !(
    (chooseMinMax?.min ?? 0) <= 1 && chooseMinMax?.max == 1
  )

  const hasOther = Boolean(question?.attributes?.choiceOther)
  const answerOptions = useAnswerOptionsRandomised(question)

  const {
    currentValue,
    handleOptionChange,
    handleOtherTextChange,
    isOtherChecked,
    otherValue,
  } = useMultiSelectAnswerValue(value, onChange)

  if (!isMultiSelect) {
    const handleSelectChange = (selectedValue: string) => {
      if (!onChange) return

      if (selectedValue) {
        // Clear OTHER_VALUE when switching away from Other
        onChange({ [selectedValue]: true })
      } else {
        onChange({})
      }
    }

    // Get selected value from object format (first key with true value, excluding OTHER_VALUE)
    const getSelectedValue = (): string => {
      const keys = Object.keys(currentValue).filter(
        (k) => k !== CHOICE_OTHER_VALUE_KEY,
      )
      return keys.length > 0 && currentValue[keys[0]] ? keys[0] : ''
    }

    const selectedValue = getSelectedValue()
    const isOtherSelected = selectedValue === CHOICE_OTHER_CODE

    return (
      <div className={cn('grid gap-2', ANSWER_CONTROL_MAX_WIDTH)}>
        <Select value={selectedValue} onValueChange={handleSelectChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose an option" />
          </SelectTrigger>
          <SelectContent>
            {answerOptions.map((answerOption) => (
              <SelectItem key={answerOption._id} value={answerOption.code}>
                {resolveLabelText(
                  answerOption.label.getLang(lang, langDefault),
                  expressionContext,
                )}
              </SelectItem>
            ))}
            {hasOther && (
              <SelectItem value={CHOICE_OTHER_CODE}>Other</SelectItem>
            )}
          </SelectContent>
        </Select>
        {hasOther && isOtherSelected && (
          <Input
            placeholder="Please specify"
            value={otherValue}
            onChange={(e) => handleOtherTextChange(e.target.value)}
          />
        )}
      </div>
    )
  }

  const selectedCodes = Object.keys(currentValue).filter(
    (k) => k !== CHOICE_OTHER_VALUE_KEY && currentValue[k],
  )

  const codeToLabel = (code: string): string => {
    if (code === CHOICE_OTHER_CODE) return 'Other'
    const label = answerOptions
      .find((answerOption) => answerOption.code === code)
      ?.label.getLang(lang, langDefault)
    return label ? resolveLabelText(label, expressionContext) : code
  }

  const summaryText =
    selectedCodes.length === 0
      ? 'Choose an option'
      : selectedCodes.length <= 2
        ? selectedCodes.map(codeToLabel).join(', ')
        : `${selectedCodes.length} selected`

  return (
    <div className="grid gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between font-normal"
          >
            <span className="truncate">{summaryText}</span>
            <ChevronDownIcon className="h-4 w-4 opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-2"
          align="start"
        >
          <div className={cn('grid gap-2', ANSWER_CONTROL_MAX_WIDTH)}>
            {answerOptions.map((answerOption) => {
              const isChecked = currentValue[answerOption.code] === true

              return (
                <div
                  className="flex items-center space-x-2"
                  key={answerOption._id}
                >
                  <Checkbox
                    id={`${question.code}-${answerOption.code}`}
                    checked={isChecked}
                    onCheckedChange={(checked) =>
                      handleOptionChange(answerOption.code, !!checked)
                    }
                    className={TOGGLE_HOVER_CLASS}
                  />
                  <label
                    htmlFor={`${question.code}-${answerOption.code}`}
                    className="m-0 text-base cursor-pointer"
                  >
                    {resolveLabelText(
                      answerOption.label.getLang(lang, langDefault),
                      expressionContext,
                    )}
                  </label>
                </div>
              )
            })}
            {hasOther && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`${question.code}-${CHOICE_OTHER_CODE}`}
                  checked={isOtherChecked}
                  onCheckedChange={(checked) =>
                    handleOptionChange(CHOICE_OTHER_CODE, !!checked)
                  }
                  className={TOGGLE_HOVER_CLASS}
                />
                <label
                  htmlFor={`${question.code}-${CHOICE_OTHER_CODE}`}
                  className="m-0 text-base cursor-pointer"
                >
                  Other
                </label>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {hasOther && isOtherChecked && (
        <Input
          placeholder="Please specify"
          value={otherValue}
          onChange={(e) => handleOtherTextChange(e.target.value)}
        />
      )}
    </div>
  )
}
