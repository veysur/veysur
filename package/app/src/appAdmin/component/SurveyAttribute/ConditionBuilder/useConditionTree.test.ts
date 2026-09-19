import { act, renderHook } from '@testing-library/react'
import { ConditionNode } from 'veysur-common'

import { createEmptyTree, useConditionTree } from './useConditionTree'

describe('createEmptyTree', () => {
  it('wraps the initial condition in a group rather than leaving it bare at root', () => {
    const tree = createEmptyTree()
    expect(tree.root.items).toHaveLength(1)
    expect(tree.root.items[0].type).toBe('group')

    const group = tree.root.items[0] as ConditionNode & { type: 'group' }
    expect(group.group.items).toHaveLength(1)
    expect(group.group.items[0].type).toBe('expression')
  })
})

describe('useConditionTree addExpression (root-level)', () => {
  it('adds subsequent root-level conditions into the existing initial group', () => {
    const { result } = renderHook(() => useConditionTree())

    const initialGroupId = (
      result.current.tree.root.items[0] as ConditionNode & { type: 'group' }
    ).group.id

    act(() => result.current.addExpression(result.current.tree.root.id))

    expect(result.current.tree.root.items).toHaveLength(1)
    const group = result.current.tree.root.items[0] as ConditionNode & {
      type: 'group'
    }
    expect(group.group.id).toBe(initialGroupId)
    expect(group.group.items).toHaveLength(2)
  })

  it('creates an initial group when root has no items yet', () => {
    const { result } = renderHook(() =>
      useConditionTree({ root: { id: 'root-1', items: [], combinator: '&&' } }),
    )

    act(() => result.current.addExpression('root-1'))

    expect(result.current.tree.root.items).toHaveLength(1)
    expect(result.current.tree.root.items[0].type).toBe('group')
    const group = result.current.tree.root.items[0] as ConditionNode & {
      type: 'group'
    }
    expect(group.group.items).toHaveLength(1)
  })

  it('does not regroup pre-existing legacy bare expressions at root', () => {
    const legacyTree = {
      root: {
        id: 'root-1',
        combinator: '&&' as const,
        items: [
          {
            type: 'expression' as const,
            expression: {
              id: 'e1',
              left: { type: 'question' as const, questionCode: 'Q001' },
            },
          },
        ],
      },
    }

    const { result } = renderHook(() => useConditionTree(legacyTree))

    act(() => result.current.addExpression('root-1'))

    // The pre-existing bare expression stays bare; the new one is appended
    // bare alongside it rather than being wrapped into a synthetic group.
    expect(result.current.tree.root.items).toHaveLength(2)
    expect(result.current.tree.root.items[0].type).toBe('expression')
    expect(result.current.tree.root.items[1].type).toBe('expression')
  })

  it('adds a condition into a specific nested group by id', () => {
    const { result } = renderHook(() => useConditionTree())

    act(() => result.current.addGroup(result.current.tree.root.id))
    const nestedGroupId = (
      result.current.tree.root.items[1] as ConditionNode & { type: 'group' }
    ).group.id

    act(() => result.current.addExpression(nestedGroupId))

    const nestedGroup = result.current.tree.root.items[1] as ConditionNode & {
      type: 'group'
    }
    expect(nestedGroup.group.items).toHaveLength(2)
    // The other root-level group is untouched
    const firstGroup = result.current.tree.root.items[0] as ConditionNode & {
      type: 'group'
    }
    expect(firstGroup.group.items).toHaveLength(1)
  })
})

describe('useConditionTree addGroup', () => {
  it('appends a new group to root alongside the existing group', () => {
    const { result } = renderHook(() => useConditionTree())

    act(() => result.current.addGroup(result.current.tree.root.id))

    expect(result.current.tree.root.items).toHaveLength(2)
    expect(result.current.tree.root.items[1].type).toBe('group')
    const newGroup = result.current.tree.root.items[1] as ConditionNode & {
      type: 'group'
    }
    expect(newGroup.group.combinator).toBe('||')
    expect(newGroup.group.items).toHaveLength(1)
  })
})
