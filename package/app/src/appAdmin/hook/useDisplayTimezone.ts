import momentTimezone from 'moment-timezone'

import { useProjectDomain } from 'hook/useProjectDomain'

/**
 * IANA zone that `appAdmin` renders every timestamp in: the project's own
 * timezone, so every member of a shared project sees the same wall-clock time
 * and the same day boundaries as the date filters. Falls back to the viewer's
 * browser zone only when the project has no timezone set. See
 * `docs/timestamps.md`.
 */
export function useDisplayTimezone(): string {
  const project = useProjectDomain()
  return project?.timezone || momentTimezone.tz.guess()
}
