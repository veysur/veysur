import { Plus, X, Group } from 'lucide-react'
import {
  ConditionGroup,
  ConditionNode,
  ConditionCombinator,
  ConditionOperand,
  ConditionOperator,
} from 'veysur-common'

import { cn } from 'common/cn'
import { Button } from 'component/shadcn/button'
import { CombinatorToggle } from './CombinatorToggle'
import { ExpressionRow } from './ExpressionRow'

interface ConditionGroupComponentProps {
  group: ConditionGroup
  onUpdateCombinator: (groupId: string, combinator: ConditionCombinator) => void
  onUpdateOperand: (
    expressionId: string,
    side: 'left' | 'right',
    operand: ConditionOperand,
  ) => void
  onUpdateOperator: (expressionId: string, operator: ConditionOperator) => void
  onDeleteNode: (nodeId: string) => void
  onAddExpression: (parentGroupId: string) => void
  onAddGroup: (parentGroupId: string) => void
  depth?: number
  isRoot?: boolean
}

export function ConditionGroupComponent({
  group,
  onUpdateCombinator,
  onUpdateOperand,
  onUpdateOperator,
  onDeleteNode,
  onAddExpression,
  onAddGroup,
  depth = 0,
  isRoot = false,
}: ConditionGroupComponentProps) {
  const canDeleteItems = group.items.length > 1 || !isRoot
  const canAddGroups = depth < 1 // Max nesting depth of 2

  const renderNode = (node: ConditionNode, index: number) => {
    const showCombinator = index > 0

    return (
      <div
        key={node.type === 'expression' ? node.expression.id : node.group.id}
      >
        {showCombinator && (
          <div className="flex justify-center py-1.5">
            <CombinatorToggle
              value={group.combinator}
              onChange={(comb) => onUpdateCombinator(group.id, comb)}
            />
          </div>
        )}

        {node.type === 'expression' ? (
          <ExpressionRow
            expression={node.expression}
            onUpdateOperand={(side, operand) =>
              onUpdateOperand(node.expression.id, side, operand)
            }
            onUpdateOperator={(op) => onUpdateOperator(node.expression.id, op)}
            onDelete={() => onDeleteNode(node.expression.id)}
            canDelete={canDeleteItems}
          />
        ) : (
          <div className="relative border border-dashed rounded-lg p-3 bg-muted/10">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDeleteNode(node.group.id)}
              className="absolute top-1 right-1 h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </Button>
            <ConditionGroupComponent
              group={node.group}
              onUpdateCombinator={onUpdateCombinator}
              onUpdateOperand={onUpdateOperand}
              onUpdateOperator={onUpdateOperator}
              onDeleteNode={onDeleteNode}
              onAddExpression={onAddExpression}
              onAddGroup={onAddGroup}
              depth={depth + 1}
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', !isRoot && 'pt-1')}>
      {group.items.map((node, index) => renderNode(node, index))}

      <div className="flex gap-2 pt-1 justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAddExpression(group.id)}
          className="h-7 text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Condition
        </Button>
        {canAddGroups && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddGroup(group.id)}
            className="h-7 text-xs"
          >
            <Group className="h-3 w-3 mr-1" />
            Add Group
          </Button>
        )}
      </div>
    </div>
  )
}
