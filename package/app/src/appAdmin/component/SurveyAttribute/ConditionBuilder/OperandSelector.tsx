import { ConditionOperand, ConditionOperandType } from 'veysur-common'

import { LeftOperandSelector } from './LeftOperandSelector'
import { RightOperandSelector } from './RightOperandSelector'

interface OperandSelectorProps {
  operand: ConditionOperand
  onChange: (operand: ConditionOperand) => void
  side: 'left' | 'right'
  selectedQuestionCode?: string // For right operand, to filter answer options
  selectedParticipantVar?: string // For right operand, to detect language comparisons
  selectedResponseVar?: string // For right operand, to detect language comparisons
  leftOperandType?: ConditionOperandType // For right operand, to gate operand types that only make sense for certain left operands
  expectedLiteralType?: 'string' | 'number' | 'boolean' // For right operand, to default the literal type picker to match the left operand's actual type
  disabled?: boolean
}

export function OperandSelector({
  operand,
  onChange,
  side,
  selectedQuestionCode,
  selectedParticipantVar,
  selectedResponseVar,
  leftOperandType,
  expectedLiteralType,
  disabled,
}: OperandSelectorProps) {
  if (side === 'right') {
    return (
      <RightOperandSelector
        operand={operand}
        onChange={onChange}
        selectedQuestionCode={selectedQuestionCode}
        selectedParticipantVar={selectedParticipantVar}
        selectedResponseVar={selectedResponseVar}
        leftOperandType={leftOperandType}
        expectedLiteralType={expectedLiteralType}
        disabled={disabled}
      />
    )
  }

  return (
    <LeftOperandSelector
      operand={operand}
      onChange={onChange}
      disabled={disabled}
    />
  )
}
