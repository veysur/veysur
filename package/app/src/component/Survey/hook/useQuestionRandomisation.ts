import { useEffect, useMemo, useRef } from 'react'
import { shuffleWithSeed } from 'veysur-common'

/**
 * Returns a deterministically shuffled copy of items when randomisation is enabled.
 *
 * On first render the hook generates a stable local seed. It reports new seeds to
 * the parent via onSeedRequired (called once via useEffect) so they can be persisted.
 * On resume the persisted seed from randomSeeds takes priority, ensuring the
 * participant always sees the same order.
 */
export function useQuestionRandomisation<T>(
  items: T[],
  seedKey: string,
  isRandomised: boolean,
  randomSeeds: Record<string, number>,
  onSeedRequired: (key: string, seed: number) => void,
): T[] {
  // Stable seed generated once for this component instance (used for new sessions)
  const localSeedRef = useRef<number>(Math.floor(Math.random() * 2 ** 32))

  // Report newly generated seed to parent after mount so it can be persisted
  useEffect(() => {
    if (!isRandomised) return
    if (randomSeeds[seedKey] === undefined) {
      onSeedRequired(seedKey, localSeedRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRandomised, seedKey])

  return useMemo(() => {
    if (!isRandomised) return items

    // Prefer persisted seed (resume case) over locally generated seed (new session)
    const seed = randomSeeds[seedKey] ?? localSeedRef.current
    return shuffleWithSeed(items, seed)
  }, [items, isRandomised, randomSeeds, seedKey])
}
