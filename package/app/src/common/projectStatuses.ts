// Cloud-only project statuses - core's trimmed Project type (self-hosted's
// single, config-sourced project) has no status field. Consumed by the
// commercial package's platform admin UI.
export const PROJECT_STATUSES: { label: string; value: string }[] = [
  { label: 'Active', value: 'active' },
  { label: 'Pending', value: 'pending' },
]
