import { useCallback, useState } from 'react'
import {
  SurveyStructuralChangeImpact,
  StructuralChangeImpact,
} from 'veysur-common'

import { useSurveyEditorStore } from './useSurveyEditorStore'

interface GuardDialogState {
  open: boolean
  message: string
  onConfirm: () => void
}

const CLOSED_DIALOG_STATE: GuardDialogState = {
  open: false,
  message: '',
  onConfirm: () => {},
}

function describeImpact(impact: StructuralChangeImpact): string {
  const conditions = Array.from(
    new Set(impact.affectedConditions.map((owner) => owner.condition)),
  )
  const plural = conditions.length > 1
  return (
    `This will invalidate ${plural ? 'these conditions' : 'this condition'}: ` +
    `${conditions.map((c) => `"${c}"`).join(', ')}. ` +
    `The condition${plural ? 's' : ''} will not be deleted, but will no longer ` +
    `evaluate correctly until fixed. Continue?`
  )
}

/**
 * Runs a structural-change impact check before committing an edit that could
 * invalidate an existing question/group condition elsewhere in the survey.
 * If the change is impacted, the caller's commit is deferred behind a
 * confirmation dialog; otherwise it runs immediately.
 */
export function useStructuralChangeGuard() {
  const [dialogState, setDialogState] =
    useState<GuardDialogState>(CLOSED_DIALOG_STATE)

  const closeDialog = useCallback(() => {
    setDialogState(CLOSED_DIALOG_STATE)
  }, [])

  const runGuard = useCallback(
    (impact: StructuralChangeImpact, commit: () => void) => {
      if (!impact.impacted) {
        commit()
        return
      }
      setDialogState({
        open: true,
        message: describeImpact(impact),
        onConfirm: () => {
          commit()
          closeDialog()
        },
      })
    },
    [closeDialog],
  )

  const guardAnswerOptionRemoval = useCallback(
    (questionId: string, answerOptionCode: string, commit: () => void) => {
      const survey = useSurveyEditorStore.getState().survey
      if (!survey) return commit()
      runGuard(
        SurveyStructuralChangeImpact.checkAnswerOptionRemoval(
          survey,
          questionId,
          answerOptionCode,
        ),
        commit,
      )
    },
    [runGuard],
  )

  const guardSubquestionRemoval = useCallback(
    (questionId: string, subquestionId: string, commit: () => void) => {
      const survey = useSurveyEditorStore.getState().survey
      if (!survey) return commit()
      runGuard(
        SurveyStructuralChangeImpact.checkSubquestionRemoval(
          survey,
          questionId,
          subquestionId,
        ),
        commit,
      )
    },
    [runGuard],
  )

  const guardQuestionTypeChange = useCallback(
    (questionId: string, newType: string, commit: () => void) => {
      const survey = useSurveyEditorStore.getState().survey
      if (!survey) return commit()
      runGuard(
        SurveyStructuralChangeImpact.checkQuestionTypeChange(
          survey,
          questionId,
          newType,
        ),
        commit,
      )
    },
    [runGuard],
  )

  const guardQuestionMove = useCallback(
    (
      questionId: string,
      targetGroupId: string,
      newIndex: number,
      commit: () => void,
    ) => {
      const survey = useSurveyEditorStore.getState().survey
      if (!survey) return commit()
      runGuard(
        SurveyStructuralChangeImpact.checkQuestionMove(
          survey,
          questionId,
          targetGroupId,
          newIndex,
        ),
        commit,
      )
    },
    [runGuard],
  )

  const guardQuestionMoveUp = useCallback(
    (questionId: string, commit: () => void) => {
      const survey = useSurveyEditorStore.getState().survey
      if (!survey) return commit()
      runGuard(
        SurveyStructuralChangeImpact.checkQuestionMoveUp(survey, questionId),
        commit,
      )
    },
    [runGuard],
  )

  const guardQuestionMoveDown = useCallback(
    (questionId: string, commit: () => void) => {
      const survey = useSurveyEditorStore.getState().survey
      if (!survey) return commit()
      runGuard(
        SurveyStructuralChangeImpact.checkQuestionMoveDown(survey, questionId),
        commit,
      )
    },
    [runGuard],
  )

  const guardQuestionGroupMove = useCallback(
    (groupId: string, newIndex: number, commit: () => void) => {
      const survey = useSurveyEditorStore.getState().survey
      if (!survey) return commit()
      runGuard(
        SurveyStructuralChangeImpact.checkQuestionGroupMove(
          survey,
          groupId,
          newIndex,
        ),
        commit,
      )
    },
    [runGuard],
  )

  return {
    dialogState,
    closeDialog,
    guardAnswerOptionRemoval,
    guardSubquestionRemoval,
    guardQuestionTypeChange,
    guardQuestionMove,
    guardQuestionMoveUp,
    guardQuestionMoveDown,
    guardQuestionGroupMove,
  }
}
