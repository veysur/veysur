import {
  ConditionOperand,
  ConditionOperandType,
  QuestionInfo,
  CONDITION_OPERAND_TYPE_QUESTION,
  CONDITION_OPERAND_TYPE_ANSWER_SELECTED,
  CONDITION_OPERAND_TYPE_ANSWER_VALUE,
  CONDITION_OPERAND_TYPE_PARTICIPANT,
  CONDITION_OPERAND_TYPE_RESPONSE,
  CONDITION_OPERAND_TYPE_MATRIX_CELL,
  CONDITION_OPERAND_TYPE_MATRIX_ANSWER_SELECTED,
  CONDITION_OPERAND_TYPE_MULTI_PART_ANSWER_SELECTED,
  isMatrixQuestionType,
  isChoiceQuestionType,
  isMatrixCellTypeBoolean,
  isMatrixOperandType,
  isMultiPartQuestionType,
  getMultiPartTypeConfig,
  getPredefinedAnswerOptions,
  CHOICE_OTHER_VALUE_KEY,
} from 'veysur-common'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'component/shadcn/select'
import { useConditionBuilderContext } from './ConditionBuilderContext'
import {
  formatQuestion,
  formatParticipantAttribute,
  formatResponseField,
  getOptionLabel,
  truncate,
} from './operandFormat'

// Build the operand for a question at a specific, explicitly-chosen
// sub-type (e.g. the user picking "Matrix Cell" from the sub-type select).
// Does not decide *which* sub-type to use — see bestDefaultSubType and
// deriveOperandForQuestion for that.
function buildOperandForSubType(
  q: QuestionInfo,
  subType: ConditionOperandType,
): ConditionOperand {
  switch (subType) {
    case CONDITION_OPERAND_TYPE_ANSWER_SELECTED:
      return {
        type: CONDITION_OPERAND_TYPE_ANSWER_SELECTED,
        questionCode: q.code,
        optionCode: q.answerOptionCodes?.[0],
      }
    case CONDITION_OPERAND_TYPE_ANSWER_VALUE:
      return {
        type: CONDITION_OPERAND_TYPE_ANSWER_VALUE,
        questionCode: q.code,
        optionCode: isMultiPartQuestionType(q.type)
          ? q.subquestions?.[0]?.code
          : CHOICE_OTHER_VALUE_KEY,
      }
    case CONDITION_OPERAND_TYPE_MULTI_PART_ANSWER_SELECTED: {
      const predefinedOptions = getPredefinedAnswerOptions(
        getMultiPartTypeConfig(q.type)?.partType ?? '',
      )
      return {
        type: CONDITION_OPERAND_TYPE_MULTI_PART_ANSWER_SELECTED,
        questionCode: q.code,
        subquestionCode: q.subquestions?.[0]?.code,
        literalValue: predefinedOptions?.[0]?.value,
      }
    }
    case CONDITION_OPERAND_TYPE_MATRIX_CELL:
      return {
        type: CONDITION_OPERAND_TYPE_MATRIX_CELL,
        questionCode: q.code,
        subquestionCode: q.subquestions?.[0]?.code,
        optionCode: q.answerOptionCodes?.[0],
      }
    case CONDITION_OPERAND_TYPE_MATRIX_ANSWER_SELECTED: {
      const booleanSubquestion = q.subquestions?.find((sq) =>
        isMatrixCellTypeBoolean(sq.type),
      )
      return {
        type: CONDITION_OPERAND_TYPE_MATRIX_ANSWER_SELECTED,
        questionCode: q.code,
        subquestionCode: booleanSubquestion?.code,
        optionCode: q.answerOptionCodes?.[0],
      }
    }
    case CONDITION_OPERAND_TYPE_QUESTION:
    default:
      return { type: CONDITION_OPERAND_TYPE_QUESTION, questionCode: q.code }
  }
}

// The sub-type a freshly-selected question should default to. Matrix and
// Multi-Part answers are stored as an object/flat part-map rather than a
// single value, so a bare "Question Value" comparison against the whole
// thing is never meaningful and this UI has no way to build an object
// literal — default to a comparison the builder can actually express
// instead.
function bestDefaultSubType(q: QuestionInfo): ConditionOperandType {
  if (isMatrixQuestionType(q.type)) {
    // Prefer the guided "Answer Selected" shorthand when the matrix has a
    // boolean row to check; fall back to "Matrix Cell" otherwise.
    return q.subquestions?.some((sq) => isMatrixCellTypeBoolean(sq.type))
      ? CONDITION_OPERAND_TYPE_MATRIX_ANSWER_SELECTED
      : CONDITION_OPERAND_TYPE_MATRIX_CELL
  }
  if (isMultiPartQuestionType(q.type)) {
    // Prefer the guided "Part Answer Selected" picker when the part type has
    // predefined values (Yes/No, Star Rating, Point-5, Point-10); fall back
    // to "Part Value" for Text/Number, which have none.
    const predefinedOptions = getPredefinedAnswerOptions(
      getMultiPartTypeConfig(q.type)?.partType ?? '',
    )
    return predefinedOptions?.length
      ? CONDITION_OPERAND_TYPE_MULTI_PART_ANSWER_SELECTED
      : CONDITION_OPERAND_TYPE_ANSWER_VALUE
  }
  return CONDITION_OPERAND_TYPE_QUESTION
}

// Whether a sub-type carried over from a previous question selection still
// makes sense for the newly-selected question q.
function isSubTypeValidForQuestion(
  subType: ConditionOperandType,
  q: QuestionInfo,
): boolean {
  switch (subType) {
    case CONDITION_OPERAND_TYPE_ANSWER_VALUE:
      return isChoiceQuestionType(q.type) || isMultiPartQuestionType(q.type)
    case CONDITION_OPERAND_TYPE_ANSWER_SELECTED:
      return isChoiceQuestionType(q.type)
    case CONDITION_OPERAND_TYPE_MULTI_PART_ANSWER_SELECTED:
      return (
        isMultiPartQuestionType(q.type) &&
        !!getPredefinedAnswerOptions(
          getMultiPartTypeConfig(q.type)?.partType ?? '',
        )?.length
      )
    case CONDITION_OPERAND_TYPE_MATRIX_CELL:
      return isMatrixQuestionType(q.type)
    case CONDITION_OPERAND_TYPE_MATRIX_ANSWER_SELECTED:
      return (
        isMatrixQuestionType(q.type) &&
        !!q.subquestions?.some((sq) => isMatrixCellTypeBoolean(sq.type))
      )
    default:
      return false
  }
}

// Derive the operand for a question, keeping preserveType's sub-type if it
// is still valid for q, otherwise falling back to q's best default sub-type.
// Called with no preserveType to get a fresh question's default operand.
export function deriveOperandForQuestion(
  q: QuestionInfo,
  preserveType?: ConditionOperandType,
): ConditionOperand {
  const subType =
    preserveType && isSubTypeValidForQuestion(preserveType, q)
      ? preserveType
      : bestDefaultSubType(q)
  return buildOperandForSubType(q, subType)
}

// Derive the primary type from a full operand type
type PrimaryType = 'question' | 'participant' | 'response'

function getPrimaryType(type: ConditionOperandType): PrimaryType {
  if (type === CONDITION_OPERAND_TYPE_PARTICIPANT) return 'participant'
  if (type === CONDITION_OPERAND_TYPE_RESPONSE) return 'response'
  return 'question'
}

interface LeftOperandSelectorProps {
  operand: ConditionOperand
  onChange: (operand: ConditionOperand) => void
  disabled?: boolean
}

export function LeftOperandSelector({
  operand,
  onChange,
  disabled,
}: LeftOperandSelectorProps) {
  const { questions, participantAttributes, responseFields } =
    useConditionBuilderContext()

  const primaryType = getPrimaryType(operand.type)

  const handlePrimaryTypeChange = (value: PrimaryType) => {
    if (value === 'participant') {
      onChange({
        type: CONDITION_OPERAND_TYPE_PARTICIPANT,
        participantVar: participantAttributes[0]?.name,
      })
    } else if (value === 'response') {
      onChange({
        type: CONDITION_OPERAND_TYPE_RESPONSE,
        responseVar: responseFields[0]?.name,
      })
    } else {
      const firstQ = questions[0]
      onChange(
        firstQ
          ? deriveOperandForQuestion(firstQ)
          : { type: CONDITION_OPERAND_TYPE_QUESTION, questionCode: undefined },
      )
    }
  }

  const selectedQuestion = questions.find(
    (q) => q.code === operand.questionCode,
  )

  const handleQuestionChange = (code: string) => {
    const q = questions.find((q) => q.code === code)
    if (!q) {
      // Fall back to plain question value
      onChange({ type: CONDITION_OPERAND_TYPE_QUESTION, questionCode: code })
      return
    }
    // Keep the same operand sub-type if it still makes sense for the new question
    onChange(deriveOperandForQuestion(q, operand.type))
  }

  const handleQuestionSubTypeChange = (subType: string) => {
    if (!selectedQuestion) return
    onChange(
      buildOperandForSubType(selectedQuestion, subType as ConditionOperandType),
    )
  }

  const handleOptionChange = (code: string) => {
    onChange({ ...operand, optionCode: code })
  }

  const handleSubquestionChange = (code: string) => {
    onChange({ ...operand, subquestionCode: code })
  }

  const handleParticipantChange = (varName: string) => {
    onChange({ ...operand, participantVar: varName })
  }

  const handleResponseChange = (fieldName: string) => {
    onChange({ ...operand, responseVar: fieldName })
  }

  // Determine sub-type options for a selected question
  const renderQuestionSubTypeSelect = () => {
    if (!selectedQuestion) return null

    const isMatrix = isMatrixQuestionType(selectedQuestion.type)
    const isChoice = isChoiceQuestionType(selectedQuestion.type)
    const isMultiPart = isMultiPartQuestionType(selectedQuestion.type)
    const hasMultiPartPredefinedOptions =
      isMultiPart &&
      !!getPredefinedAnswerOptions(
        getMultiPartTypeConfig(selectedQuestion.type)?.partType ?? '',
      )?.length

    if (!isMatrix && !isChoice && !isMultiPart) return null

    const currentSubType =
      operand.type === CONDITION_OPERAND_TYPE_ANSWER_SELECTED ||
      operand.type === CONDITION_OPERAND_TYPE_ANSWER_VALUE ||
      operand.type === CONDITION_OPERAND_TYPE_MATRIX_CELL ||
      operand.type === CONDITION_OPERAND_TYPE_MATRIX_ANSWER_SELECTED ||
      operand.type === CONDITION_OPERAND_TYPE_MULTI_PART_ANSWER_SELECTED
        ? operand.type
        : CONDITION_OPERAND_TYPE_QUESTION

    return (
      <Select
        value={currentSubType}
        onValueChange={handleQuestionSubTypeChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-40 h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {!isMatrix && !isMultiPart && (
            <SelectItem value={CONDITION_OPERAND_TYPE_QUESTION}>
              Question Value
            </SelectItem>
          )}
          {isChoice && (
            <SelectItem value={CONDITION_OPERAND_TYPE_ANSWER_SELECTED}>
              Answer Selected
            </SelectItem>
          )}
          {isChoice && (
            <SelectItem value={CONDITION_OPERAND_TYPE_ANSWER_VALUE}>
              Other Value
            </SelectItem>
          )}
          {isMultiPart && (
            <SelectItem value={CONDITION_OPERAND_TYPE_ANSWER_VALUE}>
              Part Value
            </SelectItem>
          )}
          {hasMultiPartPredefinedOptions && (
            <SelectItem
              value={CONDITION_OPERAND_TYPE_MULTI_PART_ANSWER_SELECTED}
            >
              Part Answer Selected
            </SelectItem>
          )}
          {isMatrix && (
            <SelectItem value={CONDITION_OPERAND_TYPE_MATRIX_CELL}>
              Matrix Cell
            </SelectItem>
          )}
          {isMatrix &&
            selectedQuestion.subquestions?.some((sq) =>
              isMatrixCellTypeBoolean(sq.type),
            ) && (
              <SelectItem value={CONDITION_OPERAND_TYPE_MATRIX_ANSWER_SELECTED}>
                Answer Selected
              </SelectItem>
            )}
        </SelectContent>
      </Select>
    )
  }

  // Render a part picker for a Multi-Part question (answer-selected / part-value)
  const renderPartSelect = () => (
    <Select
      value={operand.optionCode || ''}
      onValueChange={handleOptionChange}
      disabled={disabled}
    >
      <SelectTrigger className="w-40 h-8">
        <SelectValue placeholder="Part" />
      </SelectTrigger>
      <SelectContent>
        {selectedQuestion?.subquestions?.map((sq) => (
          <SelectItem key={sq.code} value={sq.code}>
            {getOptionLabel(selectedQuestion, sq.code)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  // Render additional selects for answer-selected and matrix-cell
  const renderQuestionDetails = () => {
    if (operand.type === CONDITION_OPERAND_TYPE_ANSWER_SELECTED) {
      return (
        <Select
          value={operand.optionCode || ''}
          onValueChange={handleOptionChange}
          disabled={disabled}
        >
          <SelectTrigger className="w-40 h-8">
            <SelectValue placeholder="Option" />
          </SelectTrigger>
          <SelectContent>
            {selectedQuestion?.answerOptions?.map((ao) => (
              <SelectItem key={ao.code} value={ao.code}>
                {getOptionLabel(selectedQuestion, ao.code)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    if (
      operand.type === CONDITION_OPERAND_TYPE_ANSWER_VALUE &&
      selectedQuestion &&
      isMultiPartQuestionType(selectedQuestion.type)
    ) {
      return renderPartSelect()
    }

    if (operand.type === CONDITION_OPERAND_TYPE_MULTI_PART_ANSWER_SELECTED) {
      const partType = selectedQuestion
        ? getMultiPartTypeConfig(selectedQuestion.type)?.partType
        : undefined
      const predefinedOptions = partType
        ? getPredefinedAnswerOptions(partType)
        : undefined

      return (
        <>
          <Select
            value={operand.subquestionCode || ''}
            onValueChange={handleSubquestionChange}
            disabled={disabled}
          >
            <SelectTrigger className="w-40 h-8">
              <SelectValue placeholder="Part" />
            </SelectTrigger>
            <SelectContent>
              {selectedQuestion?.subquestions?.map((sq) => (
                <SelectItem key={sq.code} value={sq.code}>
                  {getOptionLabel(selectedQuestion, sq.code)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={
              operand.literalValue !== undefined
                ? String(operand.literalValue)
                : ''
            }
            onValueChange={(v) => {
              const selectedOption = predefinedOptions?.find(
                (o) => String(o.value) === v,
              )
              onChange({ ...operand, literalValue: selectedOption?.value })
            }}
            disabled={disabled}
          >
            <SelectTrigger className="w-40 h-8">
              <SelectValue placeholder="Value" />
            </SelectTrigger>
            <SelectContent>
              {predefinedOptions?.map((o) => (
                <SelectItem key={o.code} value={String(o.value)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )
    }

    if (isMatrixOperandType(operand.type)) {
      const subquestions =
        operand.type === CONDITION_OPERAND_TYPE_MATRIX_ANSWER_SELECTED
          ? selectedQuestion?.subquestions?.filter((sq) =>
              isMatrixCellTypeBoolean(sq.type),
            )
          : selectedQuestion?.subquestions

      return (
        <>
          <Select
            value={operand.subquestionCode || ''}
            onValueChange={handleSubquestionChange}
            disabled={disabled}
          >
            <SelectTrigger className="w-40 h-8">
              <SelectValue placeholder="Subquestion" />
            </SelectTrigger>
            <SelectContent>
              {subquestions?.map((sq) => (
                <SelectItem key={sq.code} value={sq.code}>
                  {sq.text ? `${sq.code} - ${truncate(sq.text, 25)}` : sq.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={operand.optionCode || ''}
            onValueChange={handleOptionChange}
            disabled={disabled}
          >
            <SelectTrigger className="w-40 h-8">
              <SelectValue placeholder="Option" />
            </SelectTrigger>
            <SelectContent>
              {selectedQuestion?.answerOptions?.map((ao) => (
                <SelectItem key={ao.code} value={ao.code}>
                  {getOptionLabel(selectedQuestion, ao.code)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )
    }

    return null
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Primary type: Question, Participant, or Response */}
      <Select
        value={primaryType}
        onValueChange={(v) => handlePrimaryTypeChange(v as PrimaryType)}
        disabled={disabled}
      >
        <SelectTrigger className="w-32 h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="question">Question</SelectItem>
          <SelectItem value="participant">Participant</SelectItem>
          <SelectItem value="response">Response</SelectItem>
        </SelectContent>
      </Select>

      {primaryType === 'participant' && (
        <Select
          value={operand.participantVar || ''}
          onValueChange={handleParticipantChange}
          disabled={disabled}
        >
          <SelectTrigger className="w-32 h-8">
            <SelectValue placeholder="Variable" />
          </SelectTrigger>
          <SelectContent>
            {participantAttributes.map((attr) => (
              <SelectItem key={attr.name} value={attr.name}>
                {formatParticipantAttribute(attr)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {primaryType === 'response' && (
        <Select
          value={operand.responseVar || ''}
          onValueChange={handleResponseChange}
          disabled={disabled}
        >
          <SelectTrigger className="w-32 h-8">
            <SelectValue placeholder="Field" />
          </SelectTrigger>
          <SelectContent>
            {responseFields.map((field) => (
              <SelectItem key={field.name} value={field.name}>
                {formatResponseField(field)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {primaryType === 'question' &&
        (questions.length === 0 ? (
          <span className="text-xs text-muted-foreground italic">
            No questions before this element.
          </span>
        ) : (
          <>
            {/* Question select */}
            <Select
              value={operand.questionCode || ''}
              onValueChange={handleQuestionChange}
              disabled={disabled}
            >
              <SelectTrigger className="w-48 h-8">
                <SelectValue placeholder="Select Question" />
              </SelectTrigger>
              <SelectContent>
                {questions.map((q) => (
                  <SelectItem key={q.code} value={q.code}>
                    {formatQuestion(q)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sub-type select (only for choice/matrix questions) */}
            {renderQuestionSubTypeSelect()}

            {/* Answer option / subquestion selects */}
            {renderQuestionDetails()}
          </>
        ))}
    </div>
  )
}
