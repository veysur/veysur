export interface ResponseFieldMeta {
  label: string
}

/**
 * Fixed, system-defined fields addressable as `response.<field>` in
 * conditions - metadata about the response itself, kept in a container
 * separate from `answers` (question-code-keyed answers) precisely so a
 * question can never be coded the same as one of these and collide with it.
 * Unlike `participant.*`, this set isn't survey-admin-extensible - grows only
 * when a new field is added here.
 */
export const RESPONSE_FIELD_METADATA: Record<string, ResponseFieldMeta> = {
  language: { label: 'Language' },
}

export const RESPONSE_FIELD_NAMES: readonly string[] = Object.keys(
  RESPONSE_FIELD_METADATA,
)
