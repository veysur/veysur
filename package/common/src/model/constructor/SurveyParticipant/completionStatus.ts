export type CompletionStatus = 'notStarted' | 'inProgress' | 'completed'
export type CompletionStatusFilter = CompletionStatus | 'all'

export const COMPLETION_STATUSES: CompletionStatus[] = [
  'notStarted',
  'inProgress',
  'completed',
]
