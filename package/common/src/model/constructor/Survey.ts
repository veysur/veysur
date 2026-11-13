import { SurveyStructureBundle } from './SurveyStructureBundle'
import { SurveySettingsBundle } from './SurveySettingsBundle'
import { SurveySection } from './Survey/SurveySection'
import { SurveyQuestion } from './Survey/SurveyQuestion'
import { SurveyContent } from './Survey/SurveyContent'
import { SurveyAnswerOption } from './Survey/SurveyAnswerOption'
import { SurveySubquestion } from './Survey/SurveySubquestion'
import { SurveyInterface } from './Survey/SurveyInterface'

// Re-export the Survey-specific mixin components
export * from './Survey/index'

/**
 * MIXIN COMPOSITION PATTERN:
 *
 * The Survey class is built using a functional mixin pattern to compose behavior
 * from multiple sources while maintaining immutability. Each mixin function takes
 * a base class and returns an extended class with additional methods.
 *
 * The mixins are grouped into bundles (see SurveyCoreBundle, SurveyStructureBundle
 * and SurveySettingsBundle), each a `mix(...).with(...)` chain in application order.
 *
 * IMMUTABILITY PATTERN:
 *
 * All operations that modify survey state return new instances rather than
 * mutating existing ones. This is achieved through:
 *
 * - newInstance() method in Base that creates new instances with changes
 * - Smart object reuse - unchanged collections/objects are reused between instances
 * - Conditional instance creation - if no changes occur, the same instance is returned
 * - Collection immutability - all collection operations return new collection instances
 *
 * Example immutability flow:
 * survey.updateTitle('New Title')
 * → creates new L10n instance with updated title
 * → calls newInstance() with { title: newL10n }
 * → returns new Survey instance with updated title, reusing all other objects
 */
const SurveyImpl = SurveySettingsBundle(SurveyStructureBundle)

/**
 * Survey class - Immutable survey data structure with composed functionality
 *
 * This class combines data structure (Base) with behavioral mixins to create
 * a fully-featured survey model that maintains immutability across all operations.
 * All methods that modify state return new Survey instances.
 */
export class Survey extends SurveyImpl implements SurveyInterface {}

// Type definitions
export type SurveyEntity =
  | Survey
  | SurveySection
  | SurveyQuestion
  | SurveyContent
  | SurveyAnswerOption
  | SurveySubquestion

/**
 * QuestionType is now defined in Survey/attributeMeta.ts (single source of truth)
 * and re-exported through Survey/index.ts
 * @see Survey/attributeMeta.ts for the canonical definition
 */
export type { QuestionType } from './Survey/attributeMeta'

export interface L10ns {
  [key: string]: string
}
