import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Virtuoso } from 'react-virtuoso'
import { SurveySection, SurveyElementBase } from 'veysur-common'

import { cn } from 'common/cn'

import { QuestionItemView } from './QuestionItemView'
import { toQuestionDndId, toGroupContainerDndId } from './hook/dndId'

// Groups render fully once visible (only the group list itself is virtualized), so a
// single large group must virtualize its own questions too — each QuestionItemView
// calls dnd-kit's useSortable on mount, and mounting too many in one commit can exceed
// React's 50-nested-update budget (error #185). Below this count the fixed overhead of
// a second Virtuoso instance isn't worth it.
const VIRTUALIZE_QUESTIONS_THRESHOLD = 30

// This inner list deliberately does NOT share the outer group list's customScrollParent.
// Two Virtuoso instances observing the same scroll parent can feed back into each other
// (inner remeasures → outer group item resizes → outer remeasures → …) fast enough to
// blow the same 50-nested-update budget on its own. A bounded, self-scrolling viewport
// keeps this list's virtualizer fully independent of the outer one.
const QUESTIONS_VIEWPORT_HEIGHT = 500

export interface QuestionGroupQuestionsListProps {
  questionGroup: SurveySection
  questions: SurveyElementBase[]
  showQuestionDetails?: boolean
}

export const QuestionGroupQuestionsList: React.FC<QuestionGroupQuestionsListProps> =
  React.memo(
    function QuestionGroupQuestionsList({
      questionGroup,
      questions,
      showQuestionDetails = false,
    }) {
      const { setNodeRef } = useDroppable({
        id: toGroupContainerDndId(questionGroup._id),
        data: { type: 'group-container', groupId: questionGroup._id },
      })

      const renderQuestion = (question: SurveyElementBase) => (
        <QuestionItemView
          key={question._id}
          questionGroup={questionGroup}
          question={question}
          showQuestionDetails={showQuestionDetails}
        />
      )

      return (
        <SortableContext
          items={questions.map((question) => toQuestionDndId(question._id))}
          strategy={verticalListSortingStrategy}
        >
          <div
            ref={setNodeRef}
            className={cn(
              'questions-list animate-in fade-in duration-200',
              questions.length === 0 && 'min-h-8 py-1',
            )}
          >
            {questions.length > VIRTUALIZE_QUESTIONS_THRESHOLD ? (
              <Virtuoso
                style={{ height: QUESTIONS_VIEWPORT_HEIGHT }}
                data={questions}
                defaultItemHeight={32}
                itemContent={(_index, question) => renderQuestion(question)}
              />
            ) : (
              questions.map(renderQuestion)
            )}
          </div>
        </SortableContext>
      )
    },
    (prev, next) =>
      prev.questionGroup === next.questionGroup &&
      prev.showQuestionDetails === next.showQuestionDetails &&
      prev.questions.length === next.questions.length &&
      prev.questions.every((q, i) => q === next.questions[i]),
  )
