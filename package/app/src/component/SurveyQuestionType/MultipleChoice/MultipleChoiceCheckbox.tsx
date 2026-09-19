import React from 'react'

import { CHOICE_OTHER_CODE, CHOICE_OTHER_VALUE_KEY } from 'veysur-common'

import { Checkbox } from 'component/shadcn/checkbox'
import { Input } from 'component/shadcn/input'
import { RadioGroup, RadioGroupItem } from 'component/shadcn/radio-group'
import {
  ATTRIBUTE_MULTIPLE_CHOICE_RADIO,
  ATTRIBUTE_MULTIPLE_CHOICE_CHECKBOX,
} from 'component/constant'

import {
  QuestionTypeProps,
  TOGGLE_HOVER_CLASS,
  resolveLabelText,
} from '../QuestionTypeProps'
import { ToggleCell } from '../ToggleCell'
import { useChoiceMinMax } from './useChoiceMinMax'
import { useAnswerOptionsRandomised } from './useAnswerOptionsRandomised'
import { useMultiSelectAnswerValue } from './useMultiSelectAnswerValue'

export const MultipleChoiceCheckbox: React.FC<QuestionTypeProps> = ({
  question,
  value = {},
  lang,
  langDefault,
  onChange,
  expressionContext,
}) => {
  const chooseMinMax = useChoiceMinMax(question?.attributes?.choiceMinMax)

  const checkType =
    (chooseMinMax?.min ?? 0) <= 1 && chooseMinMax?.max == 1
      ? ATTRIBUTE_MULTIPLE_CHOICE_RADIO
      : ATTRIBUTE_MULTIPLE_CHOICE_CHECKBOX
  const hasOther = Boolean(question?.attributes?.choiceOther)
  const answerOptions = useAnswerOptionsRandomised(question)

  const {
    currentValue,
    handleOptionChange,
    handleOtherTextChange,
    isOtherChecked,
    otherValue,
  } = useMultiSelectAnswerValue(value, onChange)

  // Get selected key for radio (first key with true value)
  const getSelectedRadioValue = (): string => {
    const keys = Object.keys(currentValue).filter(
      (k) => k !== CHOICE_OTHER_VALUE_KEY,
    )
    return keys.length > 0 && currentValue[keys[0]] ? keys[0] : ''
  }

  if (checkType === ATTRIBUTE_MULTIPLE_CHOICE_RADIO) {
    // Radio button rendering
    return (
      <RadioGroup
        value={getSelectedRadioValue()}
        onValueChange={(val) => onChange?.(val ? { [val]: true } : {})}
        className="grid p-1 gap-2"
      >
        {answerOptions.map((answerOption) => (
          <div className="flex items-center space-x-2" key={answerOption._id}>
            <ToggleCell width="w-9">
              <RadioGroupItem
                value={answerOption.code}
                id={`${question.code}-${answerOption.code}`}
                className={TOGGLE_HOVER_CLASS}
              />
            </ToggleCell>
            <label
              htmlFor={`${question.code}-${answerOption.code}`}
              className="m-0 cursor-pointer"
            >
              {resolveLabelText(
                answerOption.label.getLang(lang, langDefault),
                expressionContext,
              )}
            </label>
          </div>
        ))}
        {hasOther && (
          <div className="flex flex-col gap-1 mt-2">
            <div className="flex items-center space-x-2">
              <ToggleCell width="w-9">
                <RadioGroupItem
                  value={CHOICE_OTHER_CODE}
                  id={`${question.code}-${CHOICE_OTHER_CODE}`}
                  className={TOGGLE_HOVER_CLASS}
                />
              </ToggleCell>
              <label
                htmlFor={`${question.code}-${CHOICE_OTHER_CODE}`}
                className="m-0 cursor-pointer"
              >
                Other
              </label>
            </div>
            {isOtherChecked && (
              <Input
                className="ml-6"
                placeholder="Please specify"
                value={otherValue}
                onChange={(e) => handleOtherTextChange(e.target.value)}
              />
            )}
          </div>
        )}
      </RadioGroup>
    )
  }

  // Checkbox rendering
  return (
    <div className="grid gap-2">
      {answerOptions.map((answerOption) => {
        const isChecked = currentValue[answerOption.code] === true

        return (
          <div className="flex items-center space-x-2" key={answerOption._id}>
            <ToggleCell width="w-9">
              <Checkbox
                id={`${question.code}-${answerOption.code}`}
                checked={isChecked}
                onCheckedChange={(checked) =>
                  handleOptionChange(answerOption.code, !!checked)
                }
                className={TOGGLE_HOVER_CLASS}
              />
            </ToggleCell>
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
        <div className="flex flex-col gap-1 mt-2">
          <div className="flex items-center space-x-2">
            <ToggleCell width="w-9">
              <Checkbox
                id={`${question.code}-${CHOICE_OTHER_CODE}`}
                checked={isOtherChecked}
                onCheckedChange={(checked) =>
                  handleOptionChange(CHOICE_OTHER_CODE, !!checked)
                }
                className={TOGGLE_HOVER_CLASS}
              />
            </ToggleCell>
            <label
              htmlFor={`${question.code}-${CHOICE_OTHER_CODE}`}
              className="m-0 text-base cursor-pointer"
            >
              Other
            </label>
          </div>
          {isOtherChecked && (
            <Input
              className="ml-6"
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
