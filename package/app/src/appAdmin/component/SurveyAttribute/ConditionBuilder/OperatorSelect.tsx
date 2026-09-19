import {
  ConditionOperator,
  ConditionOperandType,
  CONDITION_OPERAND_TYPE_QUESTION,
  CONDITION_OPERAND_TYPE_LITERAL,
  CONDITION_OPERAND_TYPE_MATRIX_CELL,
} from 'veysur-common'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'component/shadcn/select'

interface OperatorOption {
  value: ConditionOperator
  label: string
  description: string
}

const ALL_OPERATORS: OperatorOption[] = [
  { value: '===', label: '=', description: 'equals' },
  { value: '!==', label: '!=', description: 'not equals' },
  { value: '>', label: '>', description: 'greater than' },
  { value: '>=', label: '>=', description: 'greater or equal' },
  { value: '<', label: '<', description: 'less than' },
  { value: '<=', label: '<=', description: 'less or equal' },
  { value: 'includes', label: 'includes', description: 'contains value' },
]

const NUMERIC_OPERATORS = new Set(['>', '>=', '<', '<='])

interface OperatorSelectProps {
  value?: ConditionOperator
  onChange: (value: ConditionOperator) => void
  leftOperandType: ConditionOperandType
  isSelectMultiple?: boolean
  // Numeric comparators also apply to a Multi-Part "Part Value" comparison
  // when the part itself is numeric (Number/Star Rating/Point-5/Point-10) —
  // leftOperandType alone (answerValue) can't distinguish that from Choice's
  // free-text "Other Value", so the caller resolves it from the question.
  allowNumericComparison?: boolean
  disabled?: boolean
}

export function OperatorSelect({
  value,
  onChange,
  leftOperandType,
  isSelectMultiple,
  allowNumericComparison,
  disabled,
}: OperatorSelectProps) {
  // Filter operators based on context
  const availableOperators = ALL_OPERATORS.filter((op) => {
    // Includes is only for select-multiple questions
    if (op.value === 'includes') {
      return isSelectMultiple
    }

    // Numeric operators for question type, literal, matrix cell, or a
    // numeric Multi-Part "Part Value" comparison
    if (NUMERIC_OPERATORS.has(op.value)) {
      return (
        leftOperandType === CONDITION_OPERAND_TYPE_QUESTION ||
        leftOperandType === CONDITION_OPERAND_TYPE_LITERAL ||
        leftOperandType === CONDITION_OPERAND_TYPE_MATRIX_CELL ||
        !!allowNumericComparison
      )
    }

    // Equality operators are always available
    return true
  })

  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as ConditionOperator)}
      disabled={disabled}
    >
      <SelectTrigger className="w-24 h-8">
        <SelectValue placeholder="Select Op" />
      </SelectTrigger>
      <SelectContent>
        {availableOperators.map((op) => (
          <SelectItem key={op.value} value={op.value}>
            <span className="font-mono">{op.label}</span>
            <span className="ml-2 text-muted-foreground text-xs">
              {op.description}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
