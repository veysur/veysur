import { X } from 'lucide-react'
import {
  ConditionExpression,
  ConditionOperand,
  ConditionOperator,
  CONDITION_OPERAND_TYPE_LITERAL,
  CONDITION_OPERAND_TYPE_QUESTION,
  CONDITION_OPERAND_TYPE_ANSWER_VALUE,
  CONDITION_OPERAND_TYPE_MATRIX_CELL,
  QUESTION_TYPE_TEXT,
  QUESTION_TYPE_NUMBER,
  QUESTION_TYPE_YES_NO,
  QUESTION_TYPE_STAR_RATING,
  QUESTION_TYPE_POINT_5,
  QUESTION_TYPE_POINT_10,
  isChoiceQuestionType,
  isMultiPartQuestionType,
  getMultiPartTypeConfig,
  getMatrixCellType,
  isBooleanShorthandOperandType,
} from 'veysur-common'

import { Button } from 'component/shadcn/button'
import { OperandSelector } from './OperandSelector'
import { OperatorSelect } from './OperatorSelect'
import { useConditionBuilderContext } from './ConditionBuilderContext'

// Multi-Part part types whose "Part Value" comparison is numeric, so >, >=,
// <, <= are valid — unlike Choice's "Other Value" (free text) or Multi-Part
// Text/Yes-No parts, where they aren't.
const NUMERIC_MULTI_PART_TYPES = new Set([
  QUESTION_TYPE_NUMBER,
  QUESTION_TYPE_STAR_RATING,
  QUESTION_TYPE_POINT_5,
  QUESTION_TYPE_POINT_10,
])

interface ExpressionRowProps {
  expression: ConditionExpression
  onUpdateOperand: (side: 'left' | 'right', operand: ConditionOperand) => void
  onUpdateOperator: (operator: ConditionOperator) => void
  onDelete: () => void
  canDelete: boolean
}

export function ExpressionRow({
  expression,
  onUpdateOperand,
  onUpdateOperator,
  onDelete,
  canDelete,
}: ExpressionRowProps) {
  const { questions } = useConditionBuilderContext()
  const leftOperand = expression.left
  const isAnswerSelected = isBooleanShorthandOperandType(leftOperand.type)
  const isQuestionWithNoOptions =
    leftOperand.type === CONDITION_OPERAND_TYPE_QUESTION &&
    questions.length === 0

  const selectedQuestion = questions.find(
    (q) => q.code === leftOperand.questionCode,
  )
  const isSelectMultiple = selectedQuestion
    ? isChoiceQuestionType(selectedQuestion.type)
    : false

  const isNumericMultiPartValue =
    leftOperand.type === CONDITION_OPERAND_TYPE_ANSWER_VALUE &&
    !!selectedQuestion &&
    isMultiPartQuestionType(selectedQuestion.type) &&
    NUMERIC_MULTI_PART_TYPES.has(
      getMultiPartTypeConfig(selectedQuestion.type)?.partType ?? '',
    )

  // Default the right-hand literal type picker (Text/Number/Boolean) to
  // match what the left operand actually holds, instead of always starting
  // on Text — resolved from the underlying question/subquestion/part type
  // rather than the operand type alone, since e.g. answerValue covers both
  // Choice's free-text "Other Value" and a numeric Multi-Part part.
  const expectedLiteralType = (():
    'string' | 'number' | 'boolean' | undefined => {
    if (!selectedQuestion) return undefined

    if (leftOperand.type === CONDITION_OPERAND_TYPE_QUESTION) {
      if (selectedQuestion.type === QUESTION_TYPE_NUMBER) return 'number'
      if (selectedQuestion.type === QUESTION_TYPE_YES_NO) return 'boolean'
      if (selectedQuestion.type === QUESTION_TYPE_TEXT) return 'string'
      return undefined
    }

    if (
      leftOperand.type === CONDITION_OPERAND_TYPE_MATRIX_CELL &&
      leftOperand.subquestionCode
    ) {
      const subquestion = selectedQuestion.subquestions?.find(
        (sq) => sq.code === leftOperand.subquestionCode,
      )
      return subquestion ? getMatrixCellType(subquestion.type) : undefined
    }

    if (
      leftOperand.type === CONDITION_OPERAND_TYPE_ANSWER_VALUE &&
      isMultiPartQuestionType(selectedQuestion.type)
    ) {
      const partType = getMultiPartTypeConfig(selectedQuestion.type)?.partType
      if (partType === QUESTION_TYPE_NUMBER) return 'number'
      if (partType === QUESTION_TYPE_TEXT) return 'string'
      return undefined
    }

    return undefined
  })()

  return (
    <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md border">
      <div className="flex items-center gap-2 flex-wrap flex-1">
        {/* Left operand */}
        <OperandSelector
          operand={leftOperand}
          onChange={(op) => onUpdateOperand('left', op)}
          side="left"
        />

        {/* Operator and right operand - not shown for answerSelected or question with no available questions */}
        {!isAnswerSelected && !isQuestionWithNoOptions && (
          <>
            <OperatorSelect
              value={expression.operator}
              onChange={onUpdateOperator}
              leftOperandType={leftOperand.type}
              isSelectMultiple={isSelectMultiple}
              allowNumericComparison={isNumericMultiPartValue}
            />

            {expression.operator && (
              <OperandSelector
                operand={
                  expression.right || {
                    type: CONDITION_OPERAND_TYPE_LITERAL,
                    literalValue: '',
                  }
                }
                onChange={(op) => onUpdateOperand('right', op)}
                side="right"
                selectedQuestionCode={leftOperand.questionCode}
                selectedParticipantVar={leftOperand.participantVar}
                selectedResponseVar={leftOperand.responseVar}
                leftOperandType={leftOperand.type}
                expectedLiteralType={expectedLiteralType}
              />
            )}
          </>
        )}
      </div>

      {/* Delete button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        disabled={!canDelete}
        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}
