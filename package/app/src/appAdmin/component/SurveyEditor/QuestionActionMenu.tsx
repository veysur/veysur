import React from 'react'
import { ArrowLeftRight, Copy, Pencil } from 'lucide-react'
import { isMatrixQuestionType, SurveyQuestion } from 'veysur-common'

import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from 'component/shadcn/dropdown-menu'
import { ActionMenu } from 'component/ActionMenu'
import { DialogConfirmClickable } from 'component/DialogConfirmClickable'

interface QuestionActionMenuProps {
  question: SurveyQuestion
  onDuplicate?: () => void
  onAddDetail?: () => void
  onSwapAxisText?: () => void
}

export const QuestionActionMenu: React.FC<QuestionActionMenuProps> = ({
  question,
  onDuplicate,
  onAddDetail,
  onSwapAxisText,
}) => {
  const showSwapAxisText = onSwapAxisText && isMatrixQuestionType(question.type)
  const subquestionCount = question.subquestions?.length || 0
  const answerOptionCount = question.answerOptions?.length || 0
  const canSwapAxisText = subquestionCount > 0 && answerOptionCount > 0
  const swapCountMismatch = Math.abs(subquestionCount - answerOptionCount)
  const swapMessage =
    swapCountMismatch > 0
      ? `This swaps subquestion text with answer option labels. Subquestions and answer options have different counts, so ${swapCountMismatch} item${swapCountMismatch === 1 ? '' : 's'} on the longer side will have its label cleared.`
      : 'This swaps subquestion text with answer option labels.'

  return (
    <ActionMenu
      title={undefined}
      className="question-action-menu opacity-50 hover:opacity-100"
    >
      {onAddDetail && !question?.detail && (
        <DropdownMenuItem
          className="flex items-center gap-2 py-1"
          onClick={onAddDetail}
        >
          <Pencil className="h-4 w-4 text-primary" />
          <span>Add Details</span>
        </DropdownMenuItem>
      )}

      {onAddDetail &&
        !question?.detail &&
        (onDuplicate || showSwapAxisText) && <DropdownMenuSeparator />}

      {onSwapAxisText && isMatrixQuestionType(question.type) && (
        <DialogConfirmClickable
          as={DropdownMenuItem}
          title="Swap Labels"
          message={swapMessage}
          actionText="Swap"
          confirmAction={onSwapAxisText}
          className="flex items-center gap-2 py-2"
          disabled={!canSwapAxisText}
        >
          <ArrowLeftRight className="h-4 w-4 text-primary" />
          <span>Swap Labels</span>
        </DialogConfirmClickable>
      )}

      {showSwapAxisText && onDuplicate && <DropdownMenuSeparator />}

      {onDuplicate && (
        <DropdownMenuItem
          className="flex items-center gap-2 py-2"
          onClick={onDuplicate}
        >
          <Copy className="h-4 w-4 text-primary" />
          <span>Duplicate Question</span>
        </DropdownMenuItem>
      )}
    </ActionMenu>
  )
}
