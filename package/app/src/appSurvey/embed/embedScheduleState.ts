export type EmbedScheduleState = 'open' | 'notStarted' | 'ended'

// Advisory only: the API enforces the schedule when a participant starts.
export function embedScheduleState(
  schedule: { start: string | null; end: string | null } | undefined,
  now: number,
): EmbedScheduleState {
  if (schedule?.start && new Date(schedule.start).getTime() > now) {
    return 'notStarted'
  }
  if (schedule?.end && new Date(schedule.end).getTime() < now) {
    return 'ended'
  }
  return 'open'
}
