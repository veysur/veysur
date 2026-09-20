import { useAuthdQuery } from 'hook/useAuthdQuery'
import { FeatureGateMap } from 'model'

import { getFeatureGateProvider } from 'registry'

import { useProjectDomain } from 'hook/useProjectDomain'
import { KEY_STATE_FEATURE_GATES } from '../common/keyState'

const FEATURE_GATE_STALE_TIME_MS = 60 * 1000 // 1 minute — mirrors server-side cache TTL

/**
 * Feature-gate hints for the admin UI. Backed by a pluggable
 * `FeatureGateProvider` (registry-injected) so core carries no
 * commercial (plan or billing) vocabulary — the cloud edition supplies the real
 * provider; self-hosted keeps the no-op default, which returns an empty map.
 *
 * When gate data is unavailable (self-hosted, or the query is disabled) the
 * checks are permissive: `canUse` → true, `isAtLimit` → false, so nothing in
 * the admin UI is gated.
 */
export function useFeatureGate() {
  const project = useProjectDomain()
  const projectId = project?._id

  const { data, isLoading } = useAuthdQuery<FeatureGateMap>({
    queryKey: [KEY_STATE_FEATURE_GATES, projectId],
    queryFn: async () => {
      return getFeatureGateProvider().getGates(projectId!)
    },
    staleTime: FEATURE_GATE_STALE_TIME_MS,
    enabled: !!projectId,
  })

  const limits: FeatureGateMap = data ?? {}
  const hasData = data != null

  /** The raw gate status for a feature code, or undefined. */
  const byCode = (code: string) => limits[code]

  /**
   * True when the feature is available on the current plan. Permissive when no
   * gate data (self-hosted). Boolean-only — does not consider count limits.
   */
  const canUse = (code: string): boolean =>
    hasData ? (limits[code]?.available ?? false) : true

  /**
   * True when a count-based feature has reached or exceeded its limit. Always
   * false for unlimited features, self-hosted, or when gate data is unavailable.
   */
  const isAtLimit = (code: string): boolean => {
    const entry = limits[code]
    if (
      !entry ||
      entry.unlimited ||
      entry.limit == null ||
      entry.used == null
    ) {
      return false
    }
    return entry.used >= entry.limit
  }

  return { limits, isLoading, byCode, canUse, isAtLimit }
}
