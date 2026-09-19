import { useMemo } from 'react'

import { MinMax } from 'veysur-common'

export function useChoiceMinMax(choiceMinMaxAttr: unknown): MinMax {
  return useMemo(() => {
    const raw = (choiceMinMaxAttr as Partial<MinMax> | undefined) || {}
    return { min: raw.min ?? 0, max: raw.max ?? 1 }
  }, [choiceMinMaxAttr])
}
