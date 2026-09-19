/**
 * An answer option implied by a question type itself rather than stored on
 * the question's own `answerOptions` collection (e.g. yesNo's "Yes"/"No").
 *
 * `value` is the raw stored-answer value this option represents - a
 * predefined option's code is just a stable, human-referenceable alias for a
 * fixed underlying value (e.g. code `YES` stands for the boolean `true`).
 */
export interface PredefinedAnswerOption {
  code: string
  label: string
  value: boolean | number
}

/**
 * Metadata describing a question type's own behaviour, owned by the type
 * itself rather than a central per-feature list. Registered via
 * `registerQuestionTypeDefinition` so that future dynamically-loaded custom
 * question types can supply their own definition the same way.
 */
export interface QuestionTypeDefinition {
  type: string
  predefinedAnswerOptions?: PredefinedAnswerOption[]
}
