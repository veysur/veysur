import { useState, useCallback, useMemo } from 'react'
import {
  ConditionTree,
  ConditionNode,
  ConditionExpression,
  ConditionOperand,
  ConditionCombinator,
  ConditionGenerator,
  CONDITION_OPERAND_TYPE_QUESTION,
  CONDITION_OPERAND_TYPE_PARTICIPANT,
  isBooleanShorthandOperandType,
} from 'veysur-common'

function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}

function createEmptyExpression(
  defaultToParticipant = false,
  defaultParticipantVar?: string,
): ConditionExpression {
  return {
    id: generateId(),
    left: defaultToParticipant
      ? {
          type: CONDITION_OPERAND_TYPE_PARTICIPANT,
          participantVar: defaultParticipantVar,
        }
      : { type: CONDITION_OPERAND_TYPE_QUESTION },
  }
}

export function createEmptyTree(
  defaultToParticipant = false,
  defaultParticipantVar?: string,
): ConditionTree {
  return {
    root: {
      id: generateId(),
      items: [
        {
          type: 'group',
          group: {
            id: generateId(),
            items: [
              {
                type: 'expression',
                expression: createEmptyExpression(
                  defaultToParticipant,
                  defaultParticipantVar,
                ),
              },
            ],
            combinator: '&&',
          },
        },
      ],
      combinator: '&&',
    },
  }
}

function findAndUpdateNode(
  items: ConditionNode[],
  nodeId: string,
  updater: (node: ConditionNode) => ConditionNode | null,
): { items: ConditionNode[]; found: boolean } {
  const newItems: ConditionNode[] = []
  let found = false

  for (const item of items) {
    if (item.type === 'expression' && item.expression.id === nodeId) {
      const updated = updater(item)
      if (updated) {
        newItems.push(updated)
      }
      found = true
    } else if (item.type === 'group' && item.group.id === nodeId) {
      const updated = updater(item)
      if (updated) {
        newItems.push(updated)
      }
      found = true
    } else if (item.type === 'group') {
      const result = findAndUpdateNode(item.group.items, nodeId, updater)
      if (result.found) {
        found = true
        newItems.push({
          type: 'group',
          group: {
            ...item.group,
            items: result.items,
          },
        })
      } else {
        newItems.push(item)
      }
    } else {
      newItems.push(item)
    }
  }

  return { items: newItems, found }
}

function appendToGroup(
  tree: ConditionTree,
  parentGroupId: string | undefined,
  newNode: ConditionNode,
): ConditionTree {
  if (!parentGroupId || parentGroupId === tree.root.id) {
    return {
      root: {
        ...tree.root,
        items: [...tree.root.items, newNode],
      },
    }
  }

  const result = findAndUpdateNode(tree.root.items, parentGroupId, (node) => {
    if (node.type === 'group') {
      return {
        type: 'group',
        group: {
          ...node.group,
          items: [...node.group.items, newNode],
        },
      }
    }
    return node
  })

  if (result.found) {
    return {
      root: {
        ...tree.root,
        items: result.items,
      },
    }
  }

  // Fallback: add to root
  return {
    root: {
      ...tree.root,
      items: [...tree.root.items, newNode],
    },
  }
}

function applyNodeUpdate(
  tree: ConditionTree,
  nodeId: string,
  updater: (node: ConditionNode) => ConditionNode | null,
): ConditionTree {
  const result = findAndUpdateNode(tree.root.items, nodeId, updater)
  return {
    root: {
      ...tree.root,
      items: result.items,
    },
  }
}

export interface UseConditionTreeResult {
  tree: ConditionTree
  generatedJs: string
  setTree: (tree: ConditionTree) => void
  addExpression: (parentGroupId?: string) => void
  addGroup: (parentGroupId?: string) => void
  updateExpression: (
    expressionId: string,
    updates: Partial<ConditionExpression>,
  ) => void
  updateExpressionOperand: (
    expressionId: string,
    side: 'left' | 'right',
    operand: ConditionOperand,
  ) => void
  deleteNode: (nodeId: string) => void
  updateCombinator: (groupId: string, combinator: ConditionCombinator) => void
}

export function useConditionTree(
  initialTree?: ConditionTree,
  defaultToParticipant = false,
  defaultParticipantVar?: string,
): UseConditionTreeResult {
  const [tree, setTree] = useState<ConditionTree>(
    initialTree || createEmptyTree(defaultToParticipant, defaultParticipantVar),
  )

  const generatedJs = useMemo(() => {
    return ConditionGenerator.treeToJs(tree)
  }, [tree])

  const addExpression = useCallback(
    (parentGroupId?: string) => {
      setTree((prev) => {
        const newExpression: ConditionNode = {
          type: 'expression',
          expression: createEmptyExpression(
            defaultToParticipant,
            defaultParticipantVar,
          ),
        }

        // If no parent group specified, add to root: route into the first
        // existing group if there is one, create an initial group if root is
        // empty, or (legacy data) append alongside any pre-existing bare
        // root-level expressions without regrouping them.
        if (!parentGroupId || parentGroupId === prev.root.id) {
          const firstItem = prev.root.items[0]

          if (firstItem?.type === 'group') {
            return {
              root: {
                ...prev.root,
                items: [
                  {
                    type: 'group',
                    group: {
                      ...firstItem.group,
                      items: [...firstItem.group.items, newExpression],
                    },
                  },
                  ...prev.root.items.slice(1),
                ],
              },
            }
          }

          if (prev.root.items.length === 0) {
            const initialGroup: ConditionNode = {
              type: 'group',
              group: {
                id: generateId(),
                items: [newExpression],
                combinator: '&&',
              },
            }
            return {
              root: {
                ...prev.root,
                items: [initialGroup],
              },
            }
          }

          return {
            root: {
              ...prev.root,
              items: [...prev.root.items, newExpression],
            },
          }
        }

        return appendToGroup(prev, parentGroupId, newExpression)
      })
    },
    [defaultToParticipant, defaultParticipantVar],
  )

  const addGroup = useCallback(
    (parentGroupId?: string) => {
      setTree((prev) => {
        const newGroup: ConditionNode = {
          type: 'group',
          group: {
            id: generateId(),
            items: [
              {
                type: 'expression',
                expression: createEmptyExpression(
                  defaultToParticipant,
                  defaultParticipantVar,
                ),
              },
            ],
            combinator: '||', // Default to OR for nested groups
          },
        }

        return appendToGroup(prev, parentGroupId, newGroup)
      })
    },
    [defaultToParticipant, defaultParticipantVar],
  )

  const updateExpression = useCallback(
    (expressionId: string, updates: Partial<ConditionExpression>) => {
      setTree((prev) =>
        applyNodeUpdate(prev, expressionId, (node) => {
          if (node.type === 'expression') {
            return {
              type: 'expression',
              expression: {
                ...node.expression,
                ...updates,
              },
            }
          }
          return node
        }),
      )
    },
    [],
  )

  const updateExpressionOperand = useCallback(
    (
      expressionId: string,
      side: 'left' | 'right',
      operand: ConditionOperand,
    ) => {
      setTree((prev) =>
        applyNodeUpdate(prev, expressionId, (node) => {
          if (node.type === 'expression') {
            const updatedExpression = { ...node.expression }

            if (side === 'left') {
              updatedExpression.left = operand
              // If changing to answerSelected/matrixAnswerSelected, clear operator and right
              if (isBooleanShorthandOperandType(operand.type)) {
                updatedExpression.operator = undefined
                updatedExpression.right = undefined
              }
            } else {
              updatedExpression.right = operand
            }

            return {
              type: 'expression',
              expression: updatedExpression,
            }
          }
          return node
        }),
      )
    },
    [],
  )

  const deleteNode = useCallback((nodeId: string) => {
    setTree((prev) => {
      // Don't delete if it's the last item in root
      if (prev.root.items.length === 1) {
        const firstItem = prev.root.items[0]
        if (
          (firstItem.type === 'expression' &&
            firstItem.expression.id === nodeId) ||
          (firstItem.type === 'group' && firstItem.group.id === nodeId)
        ) {
          return prev
        }
      }

      return applyNodeUpdate(prev, nodeId, () => null)
    })
  }, [])

  const updateCombinator = useCallback(
    (groupId: string, combinator: ConditionCombinator) => {
      setTree((prev) => {
        // Check if it's the root group
        if (prev.root.id === groupId) {
          return {
            root: {
              ...prev.root,
              combinator,
            },
          }
        }

        return applyNodeUpdate(prev, groupId, (node) => {
          if (node.type === 'group') {
            return {
              type: 'group',
              group: {
                ...node.group,
                combinator,
              },
            }
          }
          return node
        })
      })
    },
    [],
  )

  return {
    tree,
    generatedJs,
    setTree,
    addExpression,
    addGroup,
    updateExpression,
    updateExpressionOperand,
    deleteNode,
    updateCombinator,
  }
}
