import React, { useMemo } from 'react'

import {
  CHOICE_OTHER_CODE,
  CHOICE_OTHER_VALUE_KEY,
  MinMax,
} from 'veysur-common'

import { Button } from 'component/shadcn/button'
import { ButtonGroup } from 'component/shadcn/button-group'
import { Input } from 'component/shadcn/input'

import { QuestionTypeProps, resolveLabelText } from '../QuestionTypeProps'

export const MultipleChoiceButtons: React.FC<QuestionTypeProps> = ({
  question,
  value = {},
  lang,
  langDefault,
  onChange,
  expressionContext,
}) => {
  const chooseMinMax = useMemo(
    () =>
      (question?.attributes?.choiceMinMax as Partial<MinMax> | undefined) || {
        min: 0,
        max: 1,
      },
    [question?.attributes?.choiceMinMax],
  )

  const isSingleSelect = chooseMinMax?.max === 1
  const answerOptions = question?.answerOptions || []
  const hasOther = Boolean(question?.attributes?.choiceOther)

  // Ensure value is an object (not array)
  const currentValue =
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? value
      : {}

  const handleOptionClick = (optionCode: string) => {
    if (!onChange) return

    const isSelected = currentValue[optionCode] === true

    if (isSingleSelect) {
      onChange(isSelected ? {} : { [optionCode]: true })
    } else {
      if (isSelected) {
        if (optionCode === CHOICE_OTHER_CODE) {
          const rest = { ...currentValue }
          delete rest[CHOICE_OTHER_CODE]
          delete rest[CHOICE_OTHER_VALUE_KEY]
          onChange(rest)
        } else {
          const rest = { ...currentValue }
          delete rest[optionCode]
          onChange(rest)
        }
      } else {
        onChange({ ...currentValue, [optionCode]: true })
      }
    }
  }

  const handleOtherTextChange = (text: string) => {
    if (!onChange) return
    onChange({ ...currentValue, [CHOICE_OTHER_VALUE_KEY]: text })
  }

  const isOtherSelected = currentValue[CHOICE_OTHER_CODE] === true
  const otherValue =
    typeof currentValue[CHOICE_OTHER_VALUE_KEY] === 'string'
      ? currentValue[CHOICE_OTHER_VALUE_KEY]
      : ''

  return (
    <div className="grid gap-2">
      <ButtonGroup className="flex-wrap justify-center">
        {answerOptions.map((answerOption) => {
          const isSelected = currentValue[answerOption.code] === true

          return (
            <Button
              key={answerOption._id}
              type="button"
              variant={isSelected ? 'default' : 'outline'}
              className={`transition-transform duration-150 hover:scale-110 active:scale-95 ${isSelected ? 'ring-primary' : ''}`}
              onClick={() => handleOptionClick(answerOption.code)}
            >
              {resolveLabelText(
                answerOption.label.getLang(lang, langDefault),
                expressionContext,
              )}
            </Button>
          )
        })}
      </ButtonGroup>
      {hasOther && (
        <div className="mt-2 grid gap-2">
          <div>
            <Button
              type="button"
              variant={isOtherSelected ? 'default' : 'outline'}
              className={`transition-transform duration-150 hover:scale-110 active:scale-95 ${isOtherSelected ? 'ring-primary' : ''}`}
              onClick={() => handleOptionClick(CHOICE_OTHER_CODE)}
            >
              Other
            </Button>
          </div>
          {isOtherSelected && (
            <Input
              placeholder="Please specify"
              value={otherValue}
              onChange={(e) => handleOtherTextChange(e.target.value)}
            />
          )}
        </div>
      )}
    </div>
  )
}
