import { useEffect, useMemo } from 'react'
import { QuestionInfo, ConditionTreeParser } from 'veysur-common'

import { useConditionTree, createEmptyTree } from './useConditionTree'
import { ConditionGroupComponent } from './ConditionGroupComponent'
import { ConditionPreview } from './ConditionPreview'
import {
  ParticipantAttributeOption,
  ResponseFieldOption,
} from './operandFormat'
import { ConditionBuilderContext } from './ConditionBuilderContext'

interface ConditionBuilderProps {
  value: string
  onChange: (value: string) => void
  questions: QuestionInfo[]
  participantAttributes: ParticipantAttributeOption[]
  responseFields: ResponseFieldOption[]
  languages: string[]
  onParseError?: () => void
}

export function ConditionBuilder({
  value,
  onChange,
  questions,
  participantAttributes,
  responseFields,
  languages,
  onParseError,
}: ConditionBuilderProps) {
  const {
    tree,
    generatedJs,
    setTree,
    addExpression,
    addGroup,
    updateExpression,
    updateExpressionOperand,
    deleteNode,
    updateCombinator,
  } = useConditionTree(
    undefined,
    questions.length === 0,
    participantAttributes[0]?.name,
  )

  // Extract all answer option codes from questions
  const availableAnswerCodes = useMemo(() => {
    const codes: string[] = []
    for (const question of questions) {
      if (question.answerOptionCodes) {
        codes.push(...question.answerOptionCodes)
      }
    }
    return codes
  }, [questions])

  const participantVariableNames = useMemo(
    () => new Set(participantAttributes.map((a) => a.name)),
    [participantAttributes],
  )

  // Parse incoming value into tree on mount
  useEffect(() => {
    if (value && value.trim()) {
      const parsed = ConditionTreeParser.parse(
        value,
        availableAnswerCodes,
        participantVariableNames,
      )
      if (parsed) {
        setTree(parsed)
      } else {
        // Failed to parse - notify parent to switch to code mode
        onParseError?.()
      }
    } else {
      setTree(createEmptyTree())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally mount-only: re-running on every value/onParseError/computed-deps change would re-parse and reset the tree on unrelated parent re-renders
  }, []) // Only run on mount

  // Sync generated JS back to parent
  useEffect(() => {
    // Only update if the generated JS is different from the current value
    if (generatedJs !== value) {
      onChange(generatedJs)
    }
  }, [generatedJs, value, onChange])

  return (
    <ConditionBuilderContext.Provider
      value={{
        questions,
        participantAttributes,
        responseFields,
        languages,
      }}
    >
      <div className="space-y-4">
        <ConditionGroupComponent
          group={tree.root}
          onUpdateCombinator={updateCombinator}
          onUpdateOperand={updateExpressionOperand}
          onUpdateOperator={(exprId, op) =>
            updateExpression(exprId, { operator: op })
          }
          onDeleteNode={deleteNode}
          onAddExpression={addExpression}
          onAddGroup={addGroup}
          isRoot
        />

        <ConditionPreview code={generatedJs} />
      </div>
    </ConditionBuilderContext.Provider>
  )
}
