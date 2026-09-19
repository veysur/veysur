export const QUESTION_CODE_LANG = 'LANG'
export const ATTRIBUTE_MULTIPLE_CHOICE_RADIO = 'radio'
export const ATTRIBUTE_MULTIPLE_CHOICE_CHECKBOX = 'checkbox'

// Allows typing a leading "-" for negative numbers. Native type="number"
// inputs silently reject/normalise a bare "-" as the user types it, so these
// fields use type="text" with numeric affordances and validate the fully
// typed string themselves.
export const NUMERIC_TEXT_INPUT_PROPS = {
  type: 'text',
  inputMode: 'numeric',
  pattern: '-?[0-9]*',
} as const
