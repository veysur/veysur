import { renderHook } from '@testing-library/react'
import type { L10n } from 'veysur-common'

import {
  SURVEY_ENTITY_TYPE_SUBQUESTION,
  SURVEY_ENTITY_TYPE_ANSWER_OPTION,
} from 'appAdmin/component/SurveyEditor'

import { useSortableEntityRow } from './useSortableEntityRow'

const setSurveyFocus = jest.fn()
const moveSubquestion = jest.fn()
const moveAnswerOption = jest.fn()
const guardSubquestionRemoval = jest.fn(
  (_questionId: string, _entityId: string, commit: () => void) => commit(),
)
const guardAnswerOptionRemoval = jest.fn(
  (_questionId: string, _code: string, commit: () => void) => commit(),
)

jest.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}))

jest.mock('appAdmin/component/SurveyEditor', () => {
  const actual = jest.requireActual('appAdmin/component/SurveyEditor')
  return {
    ...actual,
    useSurveyEditorStore: (
      selector: (state: {
        operations: { moveSubquestion: jest.Mock; moveAnswerOption: jest.Mock }
        langDefault: string
      }) => unknown,
    ) =>
      selector({
        operations: { moveSubquestion, moveAnswerOption },
        langDefault: 'en',
      }),
    useSurveyEditorFocus: () => ({
      surveyFocus: null,
      setSurveyFocus,
    }),
  }
})

jest.mock(
  'appAdmin/component/SurveyEditor/hook/useStructuralChangeGuard',
  () => ({
    useStructuralChangeGuard: () => ({
      guardSubquestionRemoval,
      guardAnswerOptionRemoval,
      dialogState: { open: false, message: '', onConfirm: () => {} },
      closeDialog: jest.fn(),
    }),
  }),
)

function buildLabelL10n(text: string): L10n {
  return { getLang: () => text } as unknown as L10n
}

const baseParams: Parameters<typeof useSortableEntityRow>[0] = {
  entityId: 'sq1',
  entityType: SURVEY_ENTITY_TYPE_SUBQUESTION,
  questionId: 'q1',
  entityCode: 'SQ1',
  labelL10n: buildLabelL10n('Label'),
  lang: 'en',
  langDefault: 'en',
  langEditing: 'en',
  index: 1,
  totalCount: 3,
  onUpdateText: jest.fn(),
  onDelete: jest.fn(),
}

describe('useSortableEntityRow', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    guardSubquestionRemoval.mockImplementation(
      (_questionId: string, _entityId: string, commit: () => void) => commit(),
    )
    guardAnswerOptionRemoval.mockImplementation(
      (_questionId: string, _code: string, commit: () => void) => commit(),
    )
  })

  it('calls onUpdateText with the correct arg order via handleTextChange', () => {
    const onUpdateText = jest.fn()
    const { result } = renderHook(() =>
      useSortableEntityRow({ ...baseParams, onUpdateText }),
    )

    result.current.handleTextChange('new text')

    expect(onUpdateText).toHaveBeenCalledWith(
      'q1',
      'sq1',
      'new text',
      'en',
      'en',
    )
  })

  it('routes subquestion deletion through guardSubquestionRemoval before calling onDelete', () => {
    const onDelete = jest.fn()
    const { result } = renderHook(() =>
      useSortableEntityRow({ ...baseParams, onDelete }),
    )

    result.current.handleDelete()

    expect(guardSubquestionRemoval).toHaveBeenCalledWith(
      'q1',
      'sq1',
      expect.any(Function),
    )
    expect(onDelete).toHaveBeenCalledWith('q1', 'sq1')
  })

  it('routes answer-option deletion through guardAnswerOptionRemoval before calling onDelete', () => {
    const onDelete = jest.fn()
    const { result } = renderHook(() =>
      useSortableEntityRow({
        ...baseParams,
        entityType: SURVEY_ENTITY_TYPE_ANSWER_OPTION,
        entityCode: 'AO1',
        onDelete,
      }),
    )

    result.current.handleDelete()

    expect(guardAnswerOptionRemoval).toHaveBeenCalledWith(
      'q1',
      'AO1',
      expect.any(Function),
    )
    expect(onDelete).toHaveBeenCalledWith('q1', 'sq1')
  })

  it('does not call onDelete when the guard withholds commit', () => {
    guardSubquestionRemoval.mockImplementation(() => {
      // Simulate the guard deferring commit behind a confirmation dialog.
    })
    const onDelete = jest.fn()
    const { result } = renderHook(() =>
      useSortableEntityRow({ ...baseParams, onDelete }),
    )

    result.current.handleDelete()

    expect(guardSubquestionRemoval).toHaveBeenCalled()
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('exposes handleMoveUp only when index > 0 and calls moveSubquestion with the previous index', () => {
    const { result } = renderHook(() =>
      useSortableEntityRow({ ...baseParams, index: 1, totalCount: 3 }),
    )

    expect(result.current.handleMoveUp).toBeDefined()
    result.current.handleMoveUp?.()
    expect(moveSubquestion).toHaveBeenCalledWith('q1', 'sq1', 0)
  })

  it('leaves handleMoveUp undefined when index is 0', () => {
    const { result } = renderHook(() =>
      useSortableEntityRow({ ...baseParams, index: 0, totalCount: 3 }),
    )

    expect(result.current.handleMoveUp).toBeUndefined()
  })

  it('exposes handleMoveDown only when index < totalCount - 1 and calls moveSubquestion with the next index', () => {
    const { result } = renderHook(() =>
      useSortableEntityRow({ ...baseParams, index: 1, totalCount: 3 }),
    )

    expect(result.current.handleMoveDown).toBeDefined()
    result.current.handleMoveDown?.()
    expect(moveSubquestion).toHaveBeenCalledWith('q1', 'sq1', 2)
  })

  it('leaves handleMoveDown undefined when index is the last item', () => {
    const { result } = renderHook(() =>
      useSortableEntityRow({ ...baseParams, index: 2, totalCount: 3 }),
    )

    expect(result.current.handleMoveDown).toBeUndefined()
  })

  it('calls moveAnswerOption instead of moveSubquestion for answer-option rows', () => {
    const { result } = renderHook(() =>
      useSortableEntityRow({
        ...baseParams,
        entityType: SURVEY_ENTITY_TYPE_ANSWER_OPTION,
        index: 1,
        totalCount: 3,
      }),
    )

    result.current.handleMoveUp?.()
    expect(moveAnswerOption).toHaveBeenCalledWith('q1', 'sq1', 0)
  })

  it('calls setSurveyFocus with the entity/parent identifiers via handleFocus', () => {
    const { result } = renderHook(() => useSortableEntityRow(baseParams))

    result.current.handleFocus()

    expect(setSurveyFocus).toHaveBeenCalledWith({
      entityType: SURVEY_ENTITY_TYPE_SUBQUESTION,
      id: 'sq1',
      parentId: 'q1',
    })
  })
})
