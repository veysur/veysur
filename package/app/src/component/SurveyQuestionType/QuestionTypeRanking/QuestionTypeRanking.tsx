import React from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

import { useRandomisationContext } from 'component/Survey/RandomisationContext'
import { useQuestionRandomisation } from 'component/Survey/hook/useQuestionRandomisation'

import { QuestionTypeProps, resolveLabelText } from '../QuestionTypeProps'
import {
  deriveRankingLists,
  useRankingState,
  RankingValue,
} from './useRankingState'
import { AvailableItem, RankedItem } from './RankingItem'

export const QuestionTypeRanking: React.FC<QuestionTypeProps> = ({
  question,
  value,
  lang,
  langDefault,
  onChange,
  expressionContext,
}) => {
  const rawAnswerOptions = question?.answerOptions || []
  const rankingValue: RankingValue =
    value && typeof value === 'object' ? value : {}

  const { randomSeeds, onSeedRequired } = useRandomisationContext()
  const answerOptions = useQuestionRandomisation(
    rawAnswerOptions,
    question?.code,
    Boolean(question?.attributes?.choiceRandomise),
    randomSeeds,
    onSeedRequired,
  )

  const { available, ranked } = deriveRankingLists(answerOptions, rankingValue)
  const { addItem, removeItem, moveUp, moveDown, reorder } = useRankingState(
    rankingValue,
    onChange,
  )

  const choiceMinMax = question?.attributes?.choiceMinMax as
    { min: number; max: number } | undefined
  const minRequired = choiceMinMax?.min ?? 0
  const rankedCount = ranked.length
  const showMinHint = minRequired > 0 && rankedCount < minRequired

  const sensors = useSensors(useSensor(PointerSensor), useSensor(TouchSensor))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const activeOption = answerOptions.find((opt) => opt._id === active.id)
    const overOption = answerOptions.find((opt) => opt._id === over.id)
    if (activeOption && overOption) {
      reorder(activeOption.code, overOption.code)
    }
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Left: available options */}
      <div className="flex flex-col gap-1">
        <p className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Available options
        </p>
        {available.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            All options ranked
          </p>
        ) : (
          available.map((opt) => (
            <AvailableItem
              key={opt._id}
              option={opt}
              label={resolveLabelText(
                opt.label.getLang(lang, langDefault),
                expressionContext,
              )}
              onAdd={() => addItem(opt.code)}
            />
          ))
        )}
      </div>

      {/* Right: ranked zone */}
      <div className="flex flex-col gap-1">
        <p className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Your ranking
        </p>
        {ranked.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            Add options from the left to rank them
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={ranked.map((opt) => opt._id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-1">
                {ranked.map((opt, idx) => (
                  <RankedItem
                    key={opt._id}
                    id={opt._id}
                    rank={idx + 1}
                    label={resolveLabelText(
                      opt.label.getLang(lang, langDefault),
                      expressionContext,
                    )}
                    isFirst={idx === 0}
                    isLast={idx === ranked.length - 1}
                    onRemove={() => removeItem(opt.code)}
                    onMoveUp={() => moveUp(opt.code)}
                    onMoveDown={() => moveDown(opt.code)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
        {showMinHint && (
          <p className="mt-1 text-xs text-warning">
            Please rank at least {minRequired} option
            {minRequired !== 1 ? 's' : ''}
            {rankedCount > 0 ? ` (${rankedCount} ranked so far)` : ''}.
          </p>
        )}
      </div>
    </div>
  )
}
