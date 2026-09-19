import { useCallback, useMemo } from 'react'
import { SurveyAnswerOption } from 'veysur-common'

export type RankingValue = {
  ORDER?: string[]
  [code: string]: true | string[] | undefined
}

/**
 * Derives the available (unranked) and ranked option lists from the answer value.
 */
export const deriveRankingLists = (
  answerOptions: readonly SurveyAnswerOption[],
  value: RankingValue,
): { available: SurveyAnswerOption[]; ranked: SurveyAnswerOption[] } => {
  const order: string[] = Array.isArray(value?.ORDER) ? value.ORDER : []

  const available = answerOptions.filter((opt) => !value?.[opt.code])
  const ranked = order
    .map((code) => answerOptions.find((opt) => opt.code === code))
    .filter((opt): opt is SurveyAnswerOption => opt !== undefined)

  return { available, ranked }
}

/**
 * Returns mutation helpers that produce a new value object and call onChange.
 */
export const useRankingState = (
  value: RankingValue,
  onChange?: (value: RankingValue) => void,
) => {
  const order: string[] = useMemo(
    () => (Array.isArray(value?.ORDER) ? value.ORDER : []),
    [value],
  )

  const addItem = useCallback(
    (code: string) => {
      if (!onChange || value?.[code]) return
      onChange({
        ...value,
        [code]: true,
        ORDER: [...order, code],
      } as RankingValue)
    },
    [onChange, value, order],
  )

  const removeItem = useCallback(
    (code: string) => {
      if (!onChange) return
      const next = { ...value }
      delete next[code]
      next.ORDER = order.filter((c) => c !== code)
      onChange(next as RankingValue)
    },
    [onChange, value, order],
  )

  const moveUp = useCallback(
    (code: string) => {
      if (!onChange) return
      const idx = order.indexOf(code)
      if (idx <= 0) return
      const next = [...order]
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      onChange({ ...value, ORDER: next } as RankingValue)
    },
    [onChange, value, order],
  )

  const moveDown = useCallback(
    (code: string) => {
      if (!onChange) return
      const idx = order.indexOf(code)
      if (idx === -1 || idx >= order.length - 1) return
      const next = [...order]
      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
      onChange({ ...value, ORDER: next } as RankingValue)
    },
    [onChange, value, order],
  )

  const reorder = useCallback(
    (fromCode: string, toCode: string) => {
      if (!onChange || fromCode === toCode) return
      const fromIdx = order.indexOf(fromCode)
      const toIdx = order.indexOf(toCode)
      if (fromIdx === -1 || toIdx === -1) return
      const next = [...order]
      next.splice(fromIdx, 1)
      next.splice(toIdx, 0, fromCode)
      onChange({ ...value, ORDER: next } as RankingValue)
    },
    [onChange, value, order],
  )

  return { addItem, removeItem, moveUp, moveDown, reorder }
}
