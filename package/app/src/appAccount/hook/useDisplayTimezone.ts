import { useMemo } from 'react'

/**
 * IANA zone that `appAccount` renders every timestamp in: the viewer's own
 * browser zone. Account screens are not scoped to a single project, so there is
 * no project zone to defer to. See `docs/timestamps.md`.
 */
export function useDisplayTimezone(): string {
  return useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    [],
  )
}
