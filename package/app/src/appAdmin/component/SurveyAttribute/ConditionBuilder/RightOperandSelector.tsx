import { useState } from 'react'
import {
  ConditionOperand,
  ConditionOperandType,
  CONDITION_OPERAND_TYPE_QUESTION,
  CONDITION_OPERAND_TYPE_ANSWER_OPTION,
  CONDITION_OPERAND_TYPE_LITERAL,
  isMultiPartQuestionType,
  getMultiPartTypeConfig,
  getPredefinedAnswerOptions,
  CONDITION_OPERAND_TYPE_ANSWER_VALUE,
  QUESTION_TYPE_SURVEY_LANG_SELECT,
} from 'veysur-common'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'component/shadcn/select'
import { Input } from 'component/shadcn/input'
import { useConditionBuilderContext } from './ConditionBuilderContext'
import { formatLanguage, getOptionLabel } from './operandFormat'

interface RightOperandSelectorProps {
  operand: ConditionOperand
  onChange: (operand: ConditionOperand) => void
  selectedQuestionCode?: string // to filter answer options
  selectedParticipantVar?: string // to detect language comparisons
  selectedResponseVar?: string // to detect language comparisons
  leftOperandType?: ConditionOperandType // to gate operand types that only make sense for certain left operands
  expectedLiteralType?: 'string' | 'number' | 'boolean' // to default the literal type picker to match the left operand's actual type
  disabled?: boolean
}

export function RightOperandSelector({
  operand,
  onChange,
  selectedQuestionCode,
  selectedParticipantVar,
  selectedResponseVar,
  leftOperandType,
  expectedLiteralType,
  disabled,
}: RightOperandSelectorProps) {
  const { questions, languages } = useConditionBuilderContext()
  // Starts unset so the picker defaults to whatever the left operand's
  // actual type implies (expectedLiteralType); becomes a sticky override
  // once the user explicitly picks a type.
  const [literalTypeOverride, setLiteralTypeOverride] = useState<
    'string' | 'number' | 'boolean' | null
  >(null)
  const literalType = literalTypeOverride ?? expectedLiteralType ?? 'string'

  const questionForOptions = questions.find(
    (q) => q.code === selectedQuestionCode,
  )
  // Answer-option RHS only makes sense against a plain question value — multiple
  // choice answers are stored as objects (Q001.A001), so equality against an
  // answer-option code is meaningful there. A matrix cell already fully identifies
  // a single cell (question + option + subquestion); comparing that cell's value to
  // an answer-option code is never meaningful, so it's excluded here.
  const answerOpts = questionForOptions?.answerOptions || []
  const hasAnswerOptions =
    leftOperandType === CONDITION_OPERAND_TYPE_QUESTION && answerOpts.length > 0

  const handleRightTypeChange = (type: string) => {
    if (type === CONDITION_OPERAND_TYPE_ANSWER_OPTION) {
      onChange({
        type: CONDITION_OPERAND_TYPE_ANSWER_OPTION,
        optionCode: questionForOptions?.answerOptionCodes?.[0] ?? '',
      })
    } else {
      onChange({ type: CONDITION_OPERAND_TYPE_LITERAL, literalValue: '' })
    }
  }

  const rightType =
    operand.type === CONDITION_OPERAND_TYPE_ANSWER_OPTION
      ? CONDITION_OPERAND_TYPE_ANSWER_OPTION
      : CONDITION_OPERAND_TYPE_LITERAL

  // A right operand left over as answerOption from before the left operand
  // changed to a type that no longer supports it (the toggle to switch it
  // back is hidden once there's only one valid choice) — treat it as a
  // literal instead of rendering a picker with nothing valid to pick.
  const effectiveType =
    operand.type === CONDITION_OPERAND_TYPE_ANSWER_OPTION && !hasAnswerOptions
      ? CONDITION_OPERAND_TYPE_LITERAL
      : operand.type

  const renderOperandValue = () => {
    switch (effectiveType) {
      case CONDITION_OPERAND_TYPE_ANSWER_OPTION: {
        return (
          <Select
            value={operand.optionCode || ''}
            onValueChange={(code) => onChange({ ...operand, optionCode: code })}
            disabled={disabled || answerOpts.length === 0}
          >
            <SelectTrigger className="w-40 h-8">
              <SelectValue placeholder="Select Option" />
            </SelectTrigger>
            <SelectContent>
              {answerOpts.map((ao) => (
                <SelectItem key={ao.code} value={ao.code}>
                  {getOptionLabel(questionForOptions, ao.code)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      }

      case CONDITION_OPERAND_TYPE_LITERAL: {
        const isSurveyLangSelectQuestion =
          questionForOptions?.type === QUESTION_TYPE_SURVEY_LANG_SELECT
        const hasLanguageOptions =
          (selectedParticipantVar === 'language' ||
            selectedResponseVar === 'language' ||
            isSurveyLangSelectQuestion) &&
          languages &&
          languages.length > 0

        // Multi-Part Star Rating / Point-5 / Point-10 "Part Value" comparisons
        // compare against the part's raw numeric value directly (Q001.P001 > 10),
        // not an answer-option code — predefined dot-notation tokens like
        // Q001.P4 only rewrite correctly as a bare boolean shorthand (see
        // ExpressionEvaluator's rewritePredefinedAnswerOptionTokens), not inside an
        // arbitrary operator comparison. So offer the predefined values here as
        // literal numbers via a picker instead of a raw number input.
        const multiPartPartType =
          leftOperandType === CONDITION_OPERAND_TYPE_ANSWER_VALUE &&
          questionForOptions &&
          isMultiPartQuestionType(questionForOptions.type)
            ? getMultiPartTypeConfig(questionForOptions.type)?.partType
            : undefined
        const multiPartPredefinedOptions = multiPartPartType
          ? getPredefinedAnswerOptions(multiPartPartType)
          : undefined

        if (multiPartPredefinedOptions?.length) {
          return (
            <Select
              value={
                operand.literalValue !== undefined
                  ? String(operand.literalValue)
                  : ''
              }
              onValueChange={(v) =>
                onChange({ ...operand, literalValue: Number(v) })
              }
              disabled={disabled}
            >
              <SelectTrigger className="w-32 h-8">
                <SelectValue placeholder="Select value" />
              </SelectTrigger>
              <SelectContent>
                {multiPartPredefinedOptions.map((o) => (
                  <SelectItem key={o.code} value={String(o.value)}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        }

        if (hasLanguageOptions) {
          return (
            <Select
              value={String(operand.literalValue || '')}
              onValueChange={(v) => onChange({ ...operand, literalValue: v })}
              disabled={disabled}
            >
              <SelectTrigger className="w-40 h-8">
                <SelectValue placeholder="Select Language" />
              </SelectTrigger>
              <SelectContent>
                {languages.map((code) => (
                  <SelectItem key={code} value={code}>
                    {formatLanguage(code)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        }

        return (
          <>
            <Select
              value={literalType}
              onValueChange={(v) => {
                setLiteralTypeOverride(v as 'string' | 'number' | 'boolean')
                const defaultValue =
                  v === 'number' ? 0 : v === 'boolean' ? false : ''
                onChange({ ...operand, literalValue: defaultValue })
              }}
              disabled={disabled}
            >
              <SelectTrigger className="w-24 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="string">Text</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="boolean">Boolean</SelectItem>
              </SelectContent>
            </Select>
            {literalType === 'boolean' ? (
              <Select
                value={String(operand.literalValue || false)}
                onValueChange={(v) =>
                  onChange({ ...operand, literalValue: v === 'true' })
                }
                disabled={disabled}
              >
                <SelectTrigger className="w-24 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">true</SelectItem>
                  <SelectItem value="false">false</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input
                type={literalType === 'number' ? 'number' : 'text'}
                value={
                  operand.literalValue !== undefined
                    ? String(operand.literalValue)
                    : ''
                }
                onChange={(e) => {
                  let parsedValue: string | number | boolean = e.target.value
                  if (literalType === 'number') {
                    const num = parseFloat(e.target.value)
                    parsedValue = isNaN(num) ? 0 : num
                  }
                  onChange({ ...operand, literalValue: parsedValue })
                }}
                placeholder={literalType === 'number' ? '0' : 'value'}
                disabled={disabled}
                className="w-28 h-8"
              />
            )}
          </>
        )
      }

      default:
        return null
    }
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {hasAnswerOptions && (
        <Select
          value={rightType}
          onValueChange={handleRightTypeChange}
          disabled={disabled}
        >
          <SelectTrigger className="w-32 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={CONDITION_OPERAND_TYPE_ANSWER_OPTION}>
              Answer Option
            </SelectItem>
            <SelectItem value={CONDITION_OPERAND_TYPE_LITERAL}>
              Value
            </SelectItem>
          </SelectContent>
        </Select>
      )}
      {renderOperandValue()}
    </div>
  )
}
