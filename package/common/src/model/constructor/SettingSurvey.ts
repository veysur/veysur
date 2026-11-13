import { SettingSurveyBase } from './SettingSurvey/SettingSurveyBase'
import { SettingSurveyCoreMethods } from './SettingSurvey/mixin/SettingSurveyCoreMethods'
import { SurveySettingsBundle } from './SurveySettingsBundle'
import { mix } from './mix'
import { SettingSurveyInterface } from './SettingSurvey/SettingSurveyInterface'

// Re-export the components
export * from './SettingSurvey/index'

/**
 * MIXIN COMPOSITION PATTERN:
 *
 * The SettingSurvey class is built using a functional mixin pattern to compose behavior
 * from multiple sources while maintaining immutability. Each mixin function takes
 * a base class and returns an extended class with additional methods.
 *
 * The settings mixins come from SurveySettingsBundle, shared with Survey.
 *
 * IMMUTABILITY PATTERN:
 *
 * All operations that modify survey setting state return new instances rather than
 * mutating existing ones. This is achieved through:
 *
 * - newInstance() method in Base that creates new instances with changes
 * - Smart object reuse - unchanged objects are reused between instances
 * - Conditional instance creation - if no changes occur, the same instance is returned
 *
 * Example immutability flow:
 * SettingSurvey.updatePresentation({ format: 'question' })
 * → creates new presentation object with updated format
 * → calls newInstance() with { presentation: newPresentation }
 * → returns new SettingSurvey instance with updated presentation, reusing all other objects
 */
const SettingSurveyImpl = SurveySettingsBundle(
  mix(SettingSurveyBase).with(SettingSurveyCoreMethods).base,
)

/**
 * SettingSurvey class - Immutable survey settings data structure with composed functionality
 *
 * This class combines data structure (Base) with behavioral mixins to create
 * a settings-focused model that maintains immutability across all operations.
 * All methods that modify state return new SettingSurvey instances.
 *
 * SettingSurvey contains only configuration and settings properties, excluding
 * survey content like groups, questions, titles, and welcome/thank you messages.
 */
export class SettingSurvey
  extends SettingSurveyImpl
  implements SettingSurveyInterface {}
